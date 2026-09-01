import { api } from './api';

export interface DashboardStats {
  metrics: {
    totalActiveClients: number;
    totalProjects: number;
    activeProjectsCount: number;
    inProgressProjectsCount: number;
    planningProjectsCount: number;
    completedProjectsCount: number;
    activeUsersCount: number;
  };
  recentProjects: any[];
  recentClients: any[];
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    return await api.get<DashboardStats>('/api/dashboard/stats');
  }
};
