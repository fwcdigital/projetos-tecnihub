import { api } from './api';
import type { ProjectStatusDefinition } from '../types';

const knownStatusToFrontend: Record<string, string> = {
  PLANNING: 'PLANEJAMENTO',
  WAITING_TO_START: 'AGUARDANDO_INICIO',
  IN_PROGRESS: 'EM_ANDAMENTO',
  WAITING_CLIENT: 'AGUARDANDO_CLIENTE',
  IN_REVIEW: 'EM_REVISAO',
  PAUSED: 'PAUSADO',
  COMPLETED: 'CONCLUIDO',
  CANCELLED: 'CANCELADO'
};

const knownStatusToBackend = Object.fromEntries(
  Object.entries(knownStatusToFrontend).map(([backend, frontend]) => [frontend, backend])
);

export function projectStatusToFrontend(id: string): string {
  return knownStatusToFrontend[id] || id;
}

export function projectStatusToBackend(id: string): string {
  return knownStatusToBackend[id] || id;
}

const closedProjectStatuses = new Set(['COMPLETED', 'CANCELLED', 'CONCLUIDO', 'CANCELADO']);

export function isClosedProjectStatus(id: string): boolean {
  return closedProjectStatuses.has(id) || closedProjectStatuses.has(projectStatusToBackend(id));
}

function normalize(status: any): ProjectStatusDefinition {
  return {
    id: projectStatusToFrontend(status.id),
    name: status.name,
    color: status.color,
    position: Number(status.position),
    active: Boolean(status.active),
    projectsCount: Number(status.projectsCount ?? status.projects_count ?? 0)
  };
}

export const projectStatusService = {
  getAll: async (includeInactive = false): Promise<ProjectStatusDefinition[]> => {
    const response = await api.get<{ statuses: any[] }>(`/api/project-statuses${includeInactive ? '?includeInactive=true' : ''}`);
    return response.statuses.map(normalize);
  },
  create: async (name: string, color: string): Promise<ProjectStatusDefinition> => {
    const response = await api.post<{ status: any }>('/api/project-statuses', { name, color });
    return normalize(response.status);
  },
  update: async (id: string, updates: Partial<Pick<ProjectStatusDefinition, 'name' | 'color' | 'active'>>): Promise<ProjectStatusDefinition> => {
    const response = await api.put<{ status: any }>(`/api/project-statuses/${projectStatusToBackend(id)}`, updates);
    return normalize(response.status);
  },
  remove: async (id: string): Promise<{ removed: boolean; deactivated: boolean }> => {
    return api.delete(`/api/project-statuses/${projectStatusToBackend(id)}`);
  },
  reorder: async (ids: string[]): Promise<ProjectStatusDefinition[]> => {
    const response = await api.put<{ statuses: any[] }>('/api/project-statuses/reorder', { ids: ids.map(projectStatusToBackend) });
    return response.statuses.map(normalize);
  }
};
