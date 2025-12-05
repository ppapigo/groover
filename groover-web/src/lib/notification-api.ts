// src/lib/notification-api.ts

import { api } from './api';

export type NotificationType =
  | 'DEAL_PROPOSED' | 'DEAL_ACCEPTED' | 'DEAL_REJECTED' | 'DEAL_PAID'
  | 'DEAL_SUBMITTED' | 'DEAL_CONFIRMED' | 'DEAL_SETTLED' | 'DEAL_DEADLINE'
  | 'NEW_MESSAGE' | 'SYSTEM_NOTICE' | 'WARNING_RECEIVED' | 'WITHDRAWAL_COMPLETE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export const notificationApi = {
  getNotifications: (cursor?: string, limit: number = 20) =>
    api.get<NotificationListResponse>(`/notifications?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markAsRead: (notificationId?: string) => api.post('/notifications/read', { notificationId }),
  markOneAsRead: (notificationId: string) => api.post(`/notifications/${notificationId}/read`),
};

export const notificationConfig: Record<NotificationType, { icon: string; color: string; bgColor: string }> = {
  DEAL_PROPOSED: { icon: '📩', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DEAL_ACCEPTED: { icon: '✅', color: 'text-green-600', bgColor: 'bg-green-100' },
  DEAL_REJECTED: { icon: '❌', color: 'text-red-600', bgColor: 'bg-red-100' },
  DEAL_PAID: { icon: '💳', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  DEAL_SUBMITTED: { icon: '📤', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  DEAL_CONFIRMED: { icon: '👍', color: 'text-green-600', bgColor: 'bg-green-100' },
  DEAL_SETTLED: { icon: '💰', color: 'text-green-600', bgColor: 'bg-green-100' },
  DEAL_DEADLINE: { icon: '⏰', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  NEW_MESSAGE: { icon: '💬', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SYSTEM_NOTICE: { icon: '📢', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  WARNING_RECEIVED: { icon: '⚠️', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  WITHDRAWAL_COMPLETE: { icon: '🏧', color: 'text-green-600', bgColor: 'bg-green-100' },
};
