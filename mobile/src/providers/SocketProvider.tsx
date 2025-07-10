import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { Alert } from 'react-native';
import winston from 'winston';

import { RootState, AppDispatch } from '../store';
import { addNotification } from '../store/slices/notificationsSlice';
import { updateCurrentShift } from '../store/slices/shiftSlice';
import { updateCurrentLocation } from '../store/slices/locationSlice';
import { API_BASE_URL } from '../config/api';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  const initializeSocket = () => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(API_BASE_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on('connect', () => {
      logger.info('Socket connected', { socketId: newSocket.id });
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { reason });
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      logger.error('Socket connection error', { error: error.message });
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      logger.info('Socket reconnected', { attemptNumber });
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      logger.error('Socket reconnection error', { error: error.message });
    });

    newSocket.on('reconnect_failed', () => {
      logger.error('Socket reconnection failed');
      Alert.alert(
        'Connection Failed',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    });

    // Application-specific events
    newSocket.on('notification', (data) => {
      dispatch(addNotification(data));
    });

    newSocket.on('shift_update', (data) => {
      dispatch(updateCurrentShift(data));
    });

    newSocket.on('location_update_confirmed', (data) => {
      logger.info('Location update confirmed', { data });
    });

    newSocket.on('shift_status_update_confirmed', (data) => {
      logger.info('Shift status update confirmed', { data });
    });

    newSocket.on('emergency_alert_sent', (data) => {
      Alert.alert(
        'Emergency Alert Sent',
        'Your emergency alert has been sent to supervisors.',
        [{ text: 'OK' }]
      );
    });

    newSocket.on('new_message', (data) => {
      // Handle incoming messages
      dispatch(addNotification({
        id: data.id,
        type: 'message',
        title: `Message from ${data.senderName}`,
        message: data.message,
        timestamp: data.timestamp,
        data: data
      }));
    });

    newSocket.on('typing_indicator', (data) => {
      // Handle typing indicators
      console.log('Typing indicator:', data);
    });

    newSocket.on('user_status_update', (data) => {
      // Handle user status updates
      console.log('User status update:', data);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      Alert.alert(
        'Socket Error',
        error.message || 'An error occurred with the real-time connection.',
        [{ text: 'OK' }]
      );
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const joinRoom = (roomName: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', roomName);
    }
  };

  const leaveRoom = (roomName: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', roomName);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    emit,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
