import { api, getStoredToken } from './api';
import { User, UserRole } from '../types';

const roleMapToFrontend: Record<string, UserRole> = {
  SUPER_ADMIN: 'ADMIN_PRINCIPAL',
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'GESTOR_PROJETO',
  COLLABORATOR: 'COLABORADOR'
};

const roleMapToBackend: Record<string, string> = {
  ADMIN_PRINCIPAL: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  GESTOR_PROJETO: 'PROJECT_MANAGER',
  COLABORADOR: 'COLLABORATOR'
};

export function formatUserFromBackend(u: any): User {
  return {
    id: u.id,
    name: u.name,
    role: roleMapToFrontend[u.role] || (u.role as UserRole),
    roleTitle: u.job_title || 'Especialista',
    email: u.email,
    avatar: u.avatar || '',
    position: u.job_title || 'Especialista',
    activeProjectsCount: u.activeProjectsCount || 0,
    currentTasksCount: 0,
    overdueTasksCount: 0,
    next7DaysTasksCount: 0,
    status: u.status === 'ACTIVE' ? 'ONLINE' : 'OFFLINE',
    accountStatus: u.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
  };
}

async function avatarRequest(id: string, method: 'PUT' | 'DELETE', file?: File): Promise<User> {
  const token = getStoredToken();
  const response = await fetch(`/api/users/${id}/avatar`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(file ? { 'Content-Type': file.type } : {})
    },
    body: file
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Não foi possível atualizar a foto (HTTP ${response.status}).`);
  return formatUserFromBackend(data.user);
}

export const userService = {
  getAll: async (filter?: { role?: string; status?: string; search?: string }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filter?.role) params.append('role', roleMapToBackend[filter.role] || filter.role);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<{ users: any[] }>(`/api/users${query}`);
    return res.users.map(formatUserFromBackend);
  },

  getById: async (id: string): Promise<User> => {
    const res = await api.get<{ user: any }>(`/api/users/${id}`);
    return formatUserFromBackend(res.user);
  },

  create: async (data: { name: string; email: string; password: string; role: string; job_title?: string; avatar?: string }): Promise<User> => {
    const payload = {
      ...data,
      role: roleMapToBackend[data.role] || data.role
    };
    const res = await api.post<{ user: any }>('/api/users', payload);
    return formatUserFromBackend(res.user);
  },

  update: async (id: string, data: Partial<{ name: string; email: string; password: string; role: string; job_title: string; avatar: string; status: string }>): Promise<User> => {
    const payload: any = { ...data };
    if (data.role) {
      payload.role = roleMapToBackend[data.role] || data.role;
    }
    const res = await api.put<{ user: any }>(`/api/users/${id}`, payload);
    return formatUserFromBackend(res.user);
  },

  uploadAvatar: (id: string, file: File): Promise<User> => avatarRequest(id, 'PUT', file),

  removeAvatar: (id: string): Promise<User> => avatarRequest(id, 'DELETE'),

  remove: (id: string): Promise<{ removed: boolean; deactivated: boolean }> => api.delete(`/api/users/${id}`)
};
