// src/lib/notification-api.ts
import { api } from './api';
export const notificationApi = {
    getNotifications: (cursor, limit = 20) => api.get(`/notifications?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (notificationId) => api.post('/notifications/read', { notificationId }),
    markOneAsRead: (notificationId) => api.post(`/notifications/${notificationId}/read`),
};
export const notificationConfig = {
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
