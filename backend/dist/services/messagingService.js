"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
class MessagingService {
    constructor(wsService) {
        this.wsService = wsService;
        this.encryptionKey = process.env.MESSAGE_ENCRYPTION_KEY || 'default-key';
    }
    async sendMessage(senderId, conversationId, content, type = 'text', metadata = {}, options = {}) {
        try {
            const conversation = await this.getConversation(conversationId);
            if (!conversation || !this.canUserAccessConversation(senderId, conversation)) {
                throw new Error('Access denied to conversation');
            }
            const message = {
                id: crypto_1.default.randomUUID(),
                conversationId,
                senderId,
                recipientId: options.recipientId,
                content: options.encrypt ? this.encryptMessage(content) : content,
                type,
                metadata,
                status: 'sent',
                priority: options.priority || 'normal',
                isEncrypted: options.encrypt || false,
                createdAt: new Date(),
                updatedAt: new Date(),
                replyToId: options.replyToId,
                reactions: [],
            };
            await this.storeMessage(message);
            await this.updateConversationLastMessage(conversationId, message);
            await this.deliverMessage(message, conversation);
            if (message.priority === 'urgent') {
                await this.handleUrgentMessage(message, conversation);
            }
            await this.sendPushNotifications(message, conversation);
            logger_1.logger.info(`Message sent: ${message.id} in conversation ${conversationId}`);
            return message;
        }
        catch (error) {
            logger_1.logger.error('Failed to send message:', error);
            throw error;
        }
    }
    async createConversation(creatorId, type, participantIds, options = {}) {
        try {
            const conversation = {
                id: crypto_1.default.randomUUID(),
                type,
                name: options.name,
                description: options.description,
                participants: [
                    {
                        userId: creatorId,
                        role: 'admin',
                        joinedAt: new Date(),
                        notificationSettings: { muted: false },
                    },
                    ...participantIds.map(userId => ({
                        userId,
                        role: 'member',
                        joinedAt: new Date(),
                        notificationSettings: { muted: false },
                    })),
                ],
                settings: {
                    allowFileSharing: true,
                    allowVoiceMessages: true,
                    maxParticipants: type === 'private' ? 2 : 100,
                    autoDeleteMessages: false,
                    requireApprovalToJoin: false,
                    ...options.settings,
                },
                metadata: {
                    createdBy: creatorId,
                    messageCount: 0,
                    isArchived: false,
                    tags: [],
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await this.storeConversation(conversation);
            await this.notifyConversationCreated(conversation);
            logger_1.logger.info(`Conversation created: ${conversation.id} by ${creatorId}`);
            return conversation;
        }
        catch (error) {
            logger_1.logger.error('Failed to create conversation:', error);
            throw error;
        }
    }
    async addParticipant(conversationId, userId, newParticipantId, role = 'member') {
        try {
            const conversation = await this.getConversation(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            if (!this.canUserManageConversation(userId, conversation)) {
                throw new Error('Insufficient permissions');
            }
            if (conversation.participants.some(p => p.userId === newParticipantId)) {
                throw new Error('User is already a participant');
            }
            conversation.participants.push({
                userId: newParticipantId,
                role,
                joinedAt: new Date(),
                notificationSettings: { muted: false },
            });
            conversation.updatedAt = new Date();
            await this.updateConversation(conversation);
            await this.sendSystemMessage(conversationId, `User added to conversation`, { addedUserId: newParticipantId, addedBy: userId });
            this.wsService.broadcastToRoom(conversationId, 'participant_added', {
                conversationId,
                userId: newParticipantId,
                role,
                addedBy: userId,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to add participant:', error);
            throw error;
        }
    }
    async removeParticipant(conversationId, userId, participantId) {
        try {
            const conversation = await this.getConversation(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            if (!this.canUserManageConversation(userId, conversation) && userId !== participantId) {
                throw new Error('Insufficient permissions');
            }
            conversation.participants = conversation.participants.filter(p => p.userId !== participantId);
            conversation.updatedAt = new Date();
            await this.updateConversation(conversation);
            await this.sendSystemMessage(conversationId, `User removed from conversation`, { removedUserId: participantId, removedBy: userId });
            this.wsService.broadcastToRoom(conversationId, 'participant_removed', {
                conversationId,
                userId: participantId,
                removedBy: userId,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to remove participant:', error);
            throw error;
        }
    }
    async markMessageAsRead(userId, messageId) {
        try {
            const message = await this.getMessage(messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            if (message.status !== 'read') {
                message.status = 'read';
                message.updatedAt = new Date();
                await this.updateMessage(message);
            }
            const receipt = {
                messageId,
                userId,
                status: 'read',
                timestamp: new Date(),
            };
            await this.storeDeliveryReceipt(receipt);
            await this.updateLastReadAt(message.conversationId, userId);
            this.wsService.sendToUser(message.senderId, 'message_read', {
                messageId,
                readBy: userId,
                timestamp: receipt.timestamp,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to mark message as read:', error);
            throw error;
        }
    }
    async addReaction(userId, messageId, emoji) {
        try {
            const message = await this.getMessage(messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            const existingReaction = message.reactions.find(r => r.userId === userId && r.emoji === emoji);
            if (existingReaction) {
                message.reactions = message.reactions.filter(r => !(r.userId === userId && r.emoji === emoji));
            }
            else {
                message.reactions.push({
                    userId,
                    emoji,
                    timestamp: new Date(),
                });
            }
            message.updatedAt = new Date();
            await this.updateMessage(message);
            this.wsService.broadcastToRoom(message.conversationId, 'message_reaction', {
                messageId,
                userId,
                emoji,
                action: existingReaction ? 'removed' : 'added',
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to add reaction:', error);
            throw error;
        }
    }
    async searchMessages(userId, query, filters = {}, pagination = { page: 1, limit: 20 }) {
        try {
            const conversations = await this.getUserConversations(userId);
            const conversationIds = conversations.map(c => c.id);
            if (filters.conversationId && !conversationIds.includes(filters.conversationId)) {
                return { messages: [], total: 0 };
            }
            const results = await this.searchMessagesInDatabase(query, {
                ...filters,
                conversationIds: filters.conversationId ? [filters.conversationId] : conversationIds,
            }, pagination);
            return results;
        }
        catch (error) {
            logger_1.logger.error('Failed to search messages:', error);
            throw error;
        }
    }
    async getConversationMessages(userId, conversationId, pagination = { page: 1, limit: 50 }) {
        try {
            const conversation = await this.getConversation(conversationId);
            if (!conversation || !this.canUserAccessConversation(userId, conversation)) {
                throw new Error('Access denied to conversation');
            }
            const messages = await this.getMessagesFromDatabase(conversationId, pagination);
            return {
                messages,
                hasMore: messages.length === pagination.limit,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get conversation messages:', error);
            throw error;
        }
    }
    async deliverMessage(message, conversation) {
        for (const participant of conversation.participants) {
            if (participant.userId !== message.senderId) {
                this.wsService.sendToUser(participant.userId, 'new_message', message);
            }
        }
        this.wsService.broadcastToRoom(conversation.id, 'new_message', message);
    }
    async handleUrgentMessage(message, conversation) {
        for (const participant of conversation.participants) {
            if (participant.userId !== message.senderId) {
                this.wsService.sendToUser(participant.userId, 'urgent_message', {
                    message,
                    conversation,
                });
            }
        }
    }
    async sendPushNotifications(message, conversation) {
    }
    async sendSystemMessage(conversationId, content, metadata = {}) {
        const systemMessage = {
            id: crypto_1.default.randomUUID(),
            conversationId,
            senderId: 'system',
            content,
            type: 'system',
            metadata,
            status: 'sent',
            priority: 'normal',
            isEncrypted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            reactions: [],
        };
        await this.storeMessage(systemMessage);
        this.wsService.broadcastToRoom(conversationId, 'new_message', systemMessage);
    }
    canUserAccessConversation(userId, conversation) {
        return conversation.participants.some(p => p.userId === userId);
    }
    canUserManageConversation(userId, conversation) {
        const participant = conversation.participants.find(p => p.userId === userId);
        return participant ? (participant.role === 'admin' || participant.role === 'moderator') : false;
    }
    encryptMessage(content) {
        const cipher = crypto_1.default.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(content, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    decryptMessage(encryptedContent) {
        const decipher = crypto_1.default.createDecipher('aes-256-cbc', this.encryptionKey);
        let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async storeMessage(message) {
    }
    async storeConversation(conversation) {
    }
    async updateConversation(conversation) {
    }
    async updateMessage(message) {
    }
    async getMessage(messageId) {
        return null;
    }
    async getConversation(conversationId) {
        return null;
    }
    async getUserConversations(userId) {
        return [];
    }
    async updateConversationLastMessage(conversationId, message) {
    }
    async updateLastReadAt(conversationId, userId) {
    }
    async storeDeliveryReceipt(receipt) {
    }
    async searchMessagesInDatabase(query, filters, pagination) {
        return { messages: [], total: 0 };
    }
    async getMessagesFromDatabase(conversationId, pagination) {
        return [];
    }
    async notifyConversationCreated(conversation) {
        for (const participant of conversation.participants) {
            this.wsService.sendToUser(participant.userId, 'conversation_created', conversation);
        }
    }
}
exports.default = MessagingService;
//# sourceMappingURL=messagingService.js.map