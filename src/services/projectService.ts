import { api, getStoredToken } from './api';
import { Project, ProjectResource, ProjectStatus, ProjectType, Priority } from '../types';
import { projectStatusToBackend, projectStatusToFrontend } from './projectStatusService';

export interface ProjectFilter {
  status?: string;
  clientId?: string;
  type?: string;
  search?: string;
}

const typeMapToFrontend: Record<string, ProjectType> = {
  WEBSITE: 'SITE',
  LANDING_PAGE: 'LANDING_PAGE',
  ECOMMERCE: 'ECOMMERCE',
  GOOGLE_ADS: 'GOOGLE_ADS',
  META_ADS: 'META_ADS',
  SEO: 'SEO',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  MAINTENANCE: 'MANUTENCAO',
  INTERNAL: 'INTERNO',
  OTHER: 'OUTRO'
};

const typeMapToBackend: Record<string, string> = {
  SITE: 'WEBSITE',
  LANDING_PAGE: 'LANDING_PAGE',
  ECOMMERCE: 'ECOMMERCE',
  GOOGLE_ADS: 'GOOGLE_ADS',
  META_ADS: 'META_ADS',
  SEO: 'SEO',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  MANUTENCAO: 'MAINTENANCE',
  INTERNO: 'INTERNAL',
  OUTRO: 'OTHER'
};

const priorityMapToFrontend: Record<string, Priority> = {
  URGENT: 'URGENTE',
  HIGH: 'ALTA',
  NORMAL: 'NORMAL',
  LOW: 'BAIXA'
};

const priorityMapToBackend: Record<string, string> = {
  URGENTE: 'URGENT',
  ALTA: 'HIGH',
  NORMAL: 'NORMAL',
  BAIXA: 'LOW'
};

function formatProjectFromBackend(p: any): Project {
  const teamMemberNames = Array.isArray(p.teamMembers) 
    ? p.teamMembers.map((m: any) => m.name || m) 
    : [];

  return {
    id: p.id,
    name: p.name,
    clientId: p.client_id || p.clientId,
    clientName: p.clientName || 'Cliente',
    managerId: p.manager_id || p.managerId,
    managerName: p.managerName || 'Gestor',
    managerAvatar: p.managerAvatar || '',
    teamMembers: teamMemberNames.length > 0 ? teamMemberNames : [p.managerName || 'Gestor'],
    teamMemberDetails: Array.isArray(p.teamMembers) ? p.teamMembers.map((member: any) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar || '',
      position: member.job_title || member.position || 'Especialista',
      role: member.role
    })) : [],
    startDate: p.start_date || p.startDate || '',
    dueDate: p.due_date || p.dueDate || '',
    progress: p.progress || 0,
    status: projectStatusToFrontend(p.status) as ProjectStatus,
    statusName: p.projectStatusName || p.project_status_name,
    statusColor: p.projectStatusColor || p.project_status_color,
    statusActive: p.projectStatusActive ?? p.project_status_active ?? true,
    priority: priorityMapToFrontend[p.priority] || (p.priority as Priority) || 'NORMAL',
    type: typeMapToFrontend[p.project_type] || (p.type as ProjectType) || 'SITE',
    isRecurring: Boolean(p.is_recurring ?? p.isRecurring),
    description: p.description || '',
    briefing: p.briefing && typeof p.briefing === 'object' ? p.briefing : {},
    resources: Array.isArray(p.resources) ? p.resources : [],
    tasksCount: p.tasksCount || 0,
    overdueTasksCount: p.overdueTasksCount || 0
  };
}

export const projectService = {
  getAll: async (filter?: ProjectFilter): Promise<Project[]> => {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'ALL') {
      const backendStatus = projectStatusToBackend(filter.status);
      params.append('status', backendStatus);
    }
    if (filter?.clientId && filter.clientId !== 'ALL') {
      params.append('clientId', filter.clientId);
    }
    if (filter?.type && filter.type !== 'ALL') {
      const backendType = typeMapToBackend[filter.type] || filter.type;
      params.append('type', backendType);
    }
    if (filter?.search) {
      params.append('search', filter.search);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<{ projects: any[] }>(`/api/projects${query}`);
    return res.projects.map(formatProjectFromBackend);
  },

  getById: async (id: string): Promise<Project> => {
    const res = await api.get<{ project: any }>(`/api/projects/${id}`);
    return formatProjectFromBackend(res.project);
  },

  create: async (data: Partial<Project>, teamUserIds: string[] = []): Promise<Project> => {
    const payload = {
      name: data.name,
      description: data.description,
      client_id: data.clientId,
      project_type: data.type ? (typeMapToBackend[data.type] || data.type) : 'WEBSITE',
      manager_id: data.managerId,
      status: data.status ? projectStatusToBackend(data.status) : 'PLANNING',
      priority: data.priority ? (priorityMapToBackend[data.priority] || data.priority) : 'NORMAL',
      start_date: data.startDate,
      due_date: data.dueDate,
      progress: data.progress || 0,
      is_recurring: data.isRecurring || false,
      briefing: data.briefing || {},
      team_user_ids: teamUserIds
    };

    const res = await api.post<{ project: any }>('/api/projects', payload);
    return formatProjectFromBackend(res.project);
  },

  update: async (id: string, data: Partial<Project>, teamUserIds?: string[]): Promise<Project> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.clientId) payload.client_id = data.clientId;
    if (data.type) payload.project_type = typeMapToBackend[data.type] || data.type;
    if (data.managerId) payload.manager_id = data.managerId;
    if (data.status) payload.status = projectStatusToBackend(data.status);
    if (data.priority) payload.priority = priorityMapToBackend[data.priority] || data.priority;
    if (data.startDate !== undefined) payload.start_date = data.startDate;
    if (data.dueDate !== undefined) payload.due_date = data.dueDate;
    if (data.progress !== undefined) payload.progress = data.progress;
    if (data.isRecurring !== undefined) payload.is_recurring = data.isRecurring;
    if (data.briefing !== undefined) payload.briefing = data.briefing;
    if (teamUserIds) payload.team_user_ids = teamUserIds;

    const res = await api.put<{ project: any }>(`/api/projects/${id}`, payload);
    return formatProjectFromBackend(res.project);
  },

  addDriveResource: async (projectId: string, name: string, url: string): Promise<ProjectResource> => {
    const response = await api.post<{ resource: ProjectResource }>(`/api/projects/${projectId}/resources/drive`, { name, url });
    return response.resource;
  },

  uploadResource: async (projectId: string, file: File): Promise<ProjectResource> => {
    const token = getStoredToken();
    const response = await fetch(`/api/projects/${projectId}/resources/upload?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': file.type
      },
      body: file
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Falha ao enviar material');
    return data.resource;
  },

  openResource: async (projectId: string, resource: ProjectResource): Promise<void> => {
    if (resource.kind === 'GOOGLE_DRIVE' && resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const token = getStoredToken();
    const response = await fetch(`/api/projects/${projectId}/resources/${resource.id}/open`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Não foi possível abrir o arquivo.');
    const objectUrl = URL.createObjectURL(await response.blob());
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  },

  deleteResource: async (projectId: string, resourceId: string): Promise<void> => {
    await api.delete(`/api/projects/${projectId}/resources/${resourceId}`);
  }
};
