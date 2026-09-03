import { RecurrenceRule } from '../types';
import { api } from './api';

export const routineService = {
  getAll: async (): Promise<RecurrenceRule[]> => {
    const response = await api.get<{ success: boolean; routines: RecurrenceRule[] }>('/api/routines');
    return response.routines || [];
  },
  update: async (id: string, updates: Partial<RecurrenceRule>): Promise<RecurrenceRule> => {
    const response = await api.put<{ success: boolean; routine: RecurrenceRule }>(`/api/routines/${id}`, updates);
    return response.routine;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/routines/${id}`);
  }
};
