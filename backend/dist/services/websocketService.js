"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
class WebSocketService {
    constructor(httpServer, redisClient) {
        this.connectedUsers = new Map();
        this.userSockets = new Map();
        this.rooms = new Map();
        this.messageQueue = new Map();
        this.redis = redisClient;
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000,
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupRedisSubscriptions();
        this.startCleanupTasks();
        logger_1.logger.info('WebSocket service initialized');
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication token required'));
                }
                const { clerkClient } = require('@clerk/backend');
                const sessionClaims = await clerkClient.verifyToken(token);
                if (!sessionClaims || !sessionClaims.sub) {
                    return next(new Error('Invalid token'));
                }
                const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
                const user = {
                    id: clerkUser.id,
                    email: clerkUser.emailAddresses[0]?.emailAddress || '',
                    role: clerkUser.publicMetadata?.role || 'USER',
                    permissions: clerkUser.publicMetadata?.permissions || [],
                    clientId: clerkUser.publicMetadata?.clientId,
                    agentId: clerkUser.publicMetadata?.agentId,
                };
                socket.data.user = user;
                next();
            }
            catch (error) {
                logger_1.logger.error('WebSocket authentication error:', error);
                next(new Error('Invalid authentication token'));
            }
        });
        this.io.use((socket, next) => {
            const rateLimitKey = `rate_limit:${socket.data.user.id}`;
            next();
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
            socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
            socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
            socket.on('send_message', (data) => this.handleSendMessage(socket, data));
            socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
            socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
            socket.on('location_update', (data) => this.handleLocationUpdate(socket, data));
            socket.on('emergency_alert', (data) => this.handleEmergencyAlert(socket, data));
            socket.on('status_update', (data) => this.handleStatusUpdate(socket, data));
            socket.on('disconnect', () => this.handleDisconnection(socket));
        });
    }
    setupRedisSubscriptions() {
        const subscriber = this.redis.duplicate();
        subscriber.subscribe('websocket:broadcast', 'websocket:room', 'websocket:user');
        subscriber.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                switch (channel) {
                    case 'websocket:broadcast':
                        this.broadcastToAll(data.event, data.payload);
                        break;
                    case 'websocket:room':
                        this.broadcastToRoom(data.roomId, data.event, data.payload);
                        break;
                    case 'websocket:user':
                        this.sendToUser(data.userId, data.event, data.payload);
                        break;
                }
            }
            catch (error) {
                logger_1.logger.error('Redis message processing error:', error);
            }
        });
    }
    handleConnection(socket) {
        const user = socket.data.user;
        this.connectedUsers.set(socket.id, socket);
        if (!this.userSockets.has(user.id)) {
            this.userSockets.set(user.id, new Set());
        }
        this.userSockets.get(user.id).add(socket.id);
        socket.join(`user:${user.id}`);
        socket.join(`role:${user.role}`);
        if (user.clientId) {
            socket.join(`client:${user.clientId}`);
        }
        if (user.agentId) {
            socket.join(`agent:${user.agentId}`);
        }
        this.sendQueuedMessages(user.id);
        this.broadcastUserStatus(user.id, 'online');
        logger_1.logger.info(`User ${user.email} connected via WebSocket`);
    }
    handleDisconnection(socket) {
        const user = socket.data.user;
        this.connectedUsers.delete(socket.id);
        if (this.userSockets.has(user.id)) {
            this.userSockets.get(user.id).delete(socket.id);
            if (this.userSockets.get(user.id).size === 0) {
                this.userSockets.delete(user.id);
                this.broadcastUserStatus(user.id, 'offline');
            }
        }
        logger_1.logger.info(`User ${user.email} disconnected from WebSocket`);
    }
    handleJoinRoom(socket, data) {
        const user = socket.data.user;
        if (!this.canAccessRoom(user, data.roomId)) {
            socket.emit('error', { message: 'Access denied to room' });
            return;
        }
        socket.join(data.roomId);
        socket.to(data.roomId).emit('user_joined', {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        });
        logger_1.logger.info(`User ${user.email} joined room ${data.roomId}`);
    }
    handleLeaveRoom(socket, data) {
        const user = socket.data.user;
        socket.leave(data.roomId);
        socket.to(data.roomId).emit('user_left', {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        });
        logger_1.logger.info(`User ${user.email} left room ${data.roomId}`);
    }
    async handleSendMessage(socket, data) {
        const user = socket.data.user;
        try {
            if (!this.validateMessage(data)) {
                socket.emit('error', { message: 'Invalid message format' });
                return;
            }
            const message = {
                ...data,
                id: `msg_${Date.now()}_${user.id.slice(-4)}_${data.type || 'message'}`,
                senderId: user.id,
                timestamp: new Date(),
            };
            await this.storeMessage(message);
            if (message.recipientId) {
                this.sendToUser(message.recipientId, message.type, message);
                socket.emit('message_sent', { messageId: message.id });
            }
            else if (message.roomId) {
                this.broadcastToRoom(message.roomId, message.type, message);
                socket.emit('message_sent', { messageId: message.id });
            }
            if (message.priority === 'critical') {
                this.handleCriticalMessage(message);
            }
        }
        catch (error) {
            logger_1.logger.error('Message sending error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }
    handleTypingStart(socket, data) {
        const user = socket.data.user;
        const typingData = {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        };
        if (data.roomId) {
            socket.to(data.roomId).emit('typing_start', typingData);
        }
        else if (data.recipientId) {
            this.sendToUser(data.recipientId, 'typing_start', typingData);
        }
    }
    handleTypingStop(socket, data) {
        const user = socket.data.user;
        const typingData = {
            userId: user.id,
            email: user.email,
            timestamp: new Date(),
        };
        if (data.roomId) {
            socket.to(data.roomId).emit('typing_stop', typingData);
        }
        else if (data.recipientId) {
            this.sendToUser(data.recipientId, 'typing_stop', typingData);
        }
    }
    handleLocationUpdate(socket, data) {
        const user = socket.data.user;
        this.storeLocationUpdate(user.id, data);
        this.broadcastToRole('supervisor', 'location_update', {
            userId: user.id,
            agentId: user.agentId,
            location: data,
            timestamp: new Date(),
        });
    }
    async handleEmergencyAlert(socket, data) {
        const user = socket.data.user;
        const emergencyAlert = {
            id: `emergency_${Date.now()}`,
            userId: user.id,
            agentId: user.agentId,
            type: data.type || 'general',
            location: data.location,
            description: data.description,
            timestamp: new Date(),
            status: 'active',
        };
        await this.storeEmergencyAlert(emergencyAlert);
        this.broadcastToRoles(['supervisor', 'admin'], 'emergency_alert', emergencyAlert);
        socket.emit('emergency_alert_sent', { alertId: emergencyAlert.id });
        logger_1.logger.warn(`Emergency alert from ${user.email}:`, emergencyAlert);
    }
    handleStatusUpdate(socket, data) {
        const user = socket.data.user;
        const statusUpdate = {
            userId: user.id,
            agentId: user.agentId,
            status: data.status,
            metadata: data.metadata,
            timestamp: new Date(),
        };
        this.storeStatusUpdate(statusUpdate);
        this.broadcastToRole('supervisor', 'status_update', statusUpdate);
    }
    sendToUser(userId, event, data) {
        const userSockets = this.userSockets.get(userId);
        if (userSockets && userSockets.size > 0) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
        else {
            this.queueMessage(userId, { event, data });
        }
    }
    broadcastToRoom(roomId, event, data) {
        this.io.to(roomId).emit(event, data);
    }
    broadcastToRole(role, event, data) {
        this.io.to(`role:${role}`).emit(event, data);
    }
    broadcastToRoles(roles, event, data) {
        roles.forEach(role => this.broadcastToRole(role, event, data));
    }
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }
    getConnectedUsers() {
        return Array.from(this.userSockets.keys());
    }
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }
    canAccessRoom(user, roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        if (room.participants.includes(user.id))
            return true;
        if (user.role === 'admin' || user.role === 'supervisor')
            return true;
        return false;
    }
    validateMessage(message) {
        return message &&
            typeof message.type === 'string' &&
            message.payload !== undefined &&
            (message.recipientId || message.roomId);
    }
    async storeMessage(message) {
    }
    async storeLocationUpdate(userId, location) {
    }
    async storeEmergencyAlert(alert) {
    }
    storeStatusUpdate(update) {
    }
    queueMessage(userId, message) {
        if (!this.messageQueue.has(userId)) {
            this.messageQueue.set(userId, []);
        }
        this.messageQueue.get(userId).push(message);
    }
    sendQueuedMessages(userId) {
        const messages = this.messageQueue.get(userId);
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                this.sendToUser(userId, msg.type, msg);
            });
            this.messageQueue.delete(userId);
        }
    }
    broadcastUserStatus(userId, status) {
        this.broadcastToRole('supervisor', 'user_status_change', {
            userId,
            status,
            timestamp: new Date(),
        });
    }
    handleCriticalMessage(message) {
        logger_1.logger.warn('Critical message received:', message);
    }
    startCleanupTasks() {
        setInterval(() => {
            this.cleanupMessageQueue();
        }, 60 * 60 * 1000);
    }
    cleanupMessageQueue() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        for (const [userId, messages] of this.messageQueue.entries()) {
            const recentMessages = messages.filter(msg => msg.timestamp.getTime() > cutoff);
            if (recentMessages.length === 0) {
                this.messageQueue.delete(userId);
            }
            else {
                this.messageQueue.set(userId, recentMessages);
            }
        }
    }
}
exports.default = WebSocketService;
//# sourceMappingURL=websocketService.js.map
