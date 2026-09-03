import { api } from './api';
import { ChecklistItem, Task, TaskStatus } from '../types';

export interface TaskFilter {
  projectId?: string;
  clientId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  search?: string;
  includeCompleted?: boolean;
}

type ChecklistItemUpdates = Omit<Partial<ChecklistItem>, 'dueDate' | 'dueTime' | 'assigneeId'> & {
  dueDate?: string | null;
  dueTime?: string | null;
  assigneeId?: string | null;
};

export const taskService = {
  // Obter todas as tarefas com filtros
  getAll: async (filter?: TaskFilter): Promise<Task[]> => {
    try {
      const params = new URLSearchParams();
      if (filter?.projectId) params.append('projectId', filter.projectId);
      if (filter?.clientId) params.append('clientId', filter.clientId);
      if (filter?.status) params.append('status', filter.status);
      if (filter?.assigneeId) params.append('assigneeId', filter.assigneeId);
      if (filter?.search) params.append('search', filter.search);
      if (filter?.includeCompleted) params.append('includeCompleted', 'true');

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<{ success: boolean; total: number; tasks: Task[] }>(`/api/tasks${queryString}`);

      if (response && response.tasks) {
        return response.tasks;
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      throw error;
    }
  },

  // Obter tarefa por ID
  getById: async (id: string): Promise<Task | null> => {
    try {
      const response = await api.get<{ success: boolean; task: Task }>(`/api/tasks/${id}`);
      return response?.task || null;
    } catch (error) {
      console.error(`Erro ao buscar tarefa ${id}:`, error);
      return null;
    }
  },

  // Criar nova tarefa
  create: async (taskData: Partial<Task>): Promise<Task> => {
    try {
      const response = await api.post<{ success: boolean; task: Task }>('/api/tasks', taskData);
      if (response && response.task) {
        return response.task;
      }
      throw new Error('Falha ao criar tarefa no servidor');
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      throw error;
    }
  },

  // Atualizar tarefa
  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      const response = await api.put<{ success: boolean; task: Task }>(`/api/tasks/${id}`, updates);
      if (response && response.task) {
        return response.task;
      }
      throw new Error('Falha ao atualizar tarefa');
    } catch (error) {
      console.error(`Erro ao atualizar tarefa ${id}:`, error);
      throw error;
    }
  },

  createSubtask: async (parentTask: Task, data: Partial<Task>): Promise<Task> => {
    const response = await api.post<{ success: boolean; task: Task }>('/api/tasks', {
      ...data,
      parentTaskId: parentTask.id,
      projectId: parentTask.projectId
    });
    if (!response?.task) throw new Error('Falha ao criar subtarefa');
    return response.task;
  },

  addChecklistItem: async (taskId: string, data: Partial<ChecklistItem>): Promise<Task> => {
    const response = await api.post<{ success: boolean; task: Task }>(`/api/tasks/${taskId}/checklist`, data);
    if (!response?.task) throw new Error('Falha ao criar item de checklist');
    return response.task;
  },

  updateChecklistItem: async (taskId: string, itemId: string, updates: ChecklistItemUpdates): Promise<Task> => {
    const response = await api.put<{ success: boolean; task: Task }>(`/api/tasks/${taskId}/checklist/${itemId}`, updates);
    if (!response?.task) throw new Error('Falha ao atualizar item de checklist');
    return response.task;
  },

  deleteChecklistItem: async (taskId: string, itemId: string): Promise<Task> => {
    const response = await api.delete<{ success: boolean; task: Task }>(`/api/tasks/${taskId}/checklist/${itemId}`);
    if (!response?.task) throw new Error('Falha ao excluir item de checklist');
    return response.task;
  },

  setRecurrence: async (taskId: string, recurrence: {
    frequency: string; ruleText: string; customIntervalDays?: number;
    nextOccurrenceDate?: string; occurrenceTime?: string | null;
  }): Promise<Task> => {
    const response = await api.put<{ success: boolean; task: Task }>(`/api/tasks/${taskId}/recurrence`, recurrence);
    if (!response?.task) throw new Error('Falha ao configurar recorrência');
    return response.task;
  },

  removeRecurrence: async (taskId: string): Promise<Task> => {
    const response = await api.delete<{ success: boolean; task: Task }>(`/api/tasks/${taskId}/recurrence`);
    if (!response?.task) throw new Error('Falha ao remover recorrência');
    return response.task;
  },

  addComment: async (taskId: string, content: string): Promise<Task> => {
    const response = await api.post<{ success: boolean; task: Task }>(`/api/tasks/${taskId}/comments`, { content });
    if (!response?.task) throw new Error('Falha ao adicionar comentário');
    return response.task;
  },

  // Excluir tarefa
  delete: async (id: string): Promise<boolean> => {
    const response = await api.delete<{ success: boolean }>(`/api/tasks/${id}`);
    return Boolean(response?.success);
  }
};
