import { api } from './api';
import type { Notification } from '../types';

export type NotificationFilter = 'all' | 'unread' | 'mentions';

export const notificationService = {
  getAll: async (filter: NotificationFilter = 'all', limit = 100): Promise<Notification[]> => {
    const response = await api.get<{ success: boolean; notifications: Notification[] }>(`/api/notifications?filter=${filter}&limit=${limit}`);
    return response.notifications || [];
  },
  markRead: async (id: string): Promise<Notification> => {
    const response = await api.patch<{ success: boolean; notification: Notification }>(`/api/notifications/${id}/read`);
    return response.notification;
  },
  markAllRead: async (): Promise<number> => {
    const response = await api.patch<{ success: boolean; updated: number }>('/api/notifications/read-all');
    return response.updated;
  }
};
