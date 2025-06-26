/// <reference types="node" />
import { Server as SocketIOServer } from 'socket.io';
import { EventEmitter } from 'events';
export interface NotificationData {
    type: 'SYSTEM' | 'SECURITY' | 'INCIDENT' | 'SHIFT' | 'TRAINING' | 'MAINTENANCE' | 'BILLING';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
    title: string;
    message: string;
    recipientId?: string;
    recipientRole?: string;
    senderId?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    actionUrl?: string;
    expiresAt?: Date;
    channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
    metadata?: any;
}
export declare class NotificationService extends EventEmitter {
    private static instance;
    private io;
    private connectedUsers;
    private constructor();
    static getInstance(): NotificationService;
    setSocketIO(io: SocketIOServer): void;
    private setupSocketHandlers;
    private associateUserSocket;
    private removeUserSocket;
    sendNotification(data: NotificationData): Promise<string>;
    sendBulkNotification(data: NotificationData & {
        recipientRole: string;
    }): Promise<string[]>;
    private deliverNotification;
    private sendInAppNotification;
    private sendEmailNotification;
    private sendSMSNotification;
    private sendPushNotification;
    private generateEmailContent;
    markAsRead(notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
        notifications: {
            data: import("@prisma/client/runtime/library").JsonValue;
            message: string;
            id: string;
            type: import(".prisma/client").$Enums.NotificationType;
            createdAt: Date;
            title: string;
            status: import(".prisma/client").$Enums.NotificationStatus;
            recipientId: string;
            senderId: string | null;
            channels: import(".prisma/client").$Enums.NotificationChannel[];
            scheduledAt: Date;
            sentAt: Date | null;
            readAt: Date | null;
            isRead: boolean;
            expiresAt: Date | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getUnreadCount(userId: string): Promise<number>;
    cleanupExpiredNotifications(): Promise<void>;
    sendEmergencyNotification(data: NotificationData & {
        emergencyLevel: 'CRITICAL' | 'HIGH';
    }): Promise<string>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notificationService.d.ts.map