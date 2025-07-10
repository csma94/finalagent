import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAppSelector } from '../store';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SocketProvider] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[SocketProvider] ${message}`, ...args);
  }
};
type Socket = any;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isSignedIn } = useAppSelector((state) => state.clerkAuth);
  const { getToken } = useClerkAuth();

  useEffect(() => {
    if (isSignedIn) {
      getToken().then((token) => {
        if (token) {
          // Initialize socket connection
          const socketUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';
          const newSocket = io(socketUrl, {
            auth: {
              token: token,
            },
            transports: ['websocket'],
          });

          newSocket.on('connect', () => {
            logger.info('Socket connected');
            setIsConnected(true);
          });

          newSocket.on('disconnect', () => {
            logger.info('Socket disconnected');
            setIsConnected(false);
          });

          newSocket.on('connect_error', (error: any) => {
            logger.error('Socket connection error:', error);
            setIsConnected(false);
          });

          setSocket(newSocket);
        }
      }).catch((error) => {
        logger.error('Failed to get Clerk token:', error);
      });
    } else {
      // Clean up socket if not signed in
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
