import { api, setStoredToken, getStoredToken } from './api';
import { User } from '../types';
import { formatUserFromBackend } from './userService';

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await api.post<LoginResponse>('/api/auth/login', { email, password });
    if (data.token) {
      setStoredToken(data.token);
    }
    return {
      ...data,
      user: formatUserFromBackend(data.user)
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const data = await api.get<{ user: User }>('/api/auth/me');
      return formatUserFromBackend(data.user);
    } catch {
      setStoredToken(null);
      return null;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore network failure on logout
    } finally {
      setStoredToken(null);
    }
  }
};
