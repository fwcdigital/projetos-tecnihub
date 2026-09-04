import { Priority, ProductStatusDefinition, Project, ProjectStatusDefinition, Task, TaskStatus } from '../types';

export interface StatusVisualConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export interface PriorityVisualConfig {
  label: string;
  color: string;
  surface: string;
}

const STATUS_VISUALS: Record<string, StatusVisualConfig> = {
  BACKLOG: { label: 'Backlog', bg: 'bg-zinc-800/70', text: 'text-zinc-300', border: 'border-zinc-700', dot: 'bg-zinc-400' },
  A_FAZER: { label: 'A fazer', bg: 'bg-blue-950/45', text: 'text-blue-300', border: 'border-blue-700/55', dot: 'bg-blue-400' },
  AGUARDANDO_INICIO: { label: 'Aguardando início', bg: 'bg-blue-950/45', text: 'text-blue-300', border: 'border-blue-700/55', dot: 'bg-blue-400' },
  PLANEJAMENTO: { label: 'Planejamento', bg: 'bg-indigo-950/45', text: 'text-indigo-300', border: 'border-indigo-700/55', dot: 'bg-indigo-400' },
  EM_ANDAMENTO: { label: 'Em andamento', bg: 'bg-emerald-950/45', text: 'text-emerald-300', border: 'border-emerald-700/55', dot: 'bg-emerald-400' },
  AGUARDANDO_CLIENTE: { label: 'Aguardando cliente', bg: 'bg-amber-950/45', text: 'text-amber-300', border: 'border-amber-700/55', dot: 'bg-amber-400' },
  EM_REVISAO: { label: 'Em revisão', bg: 'bg-purple-950/45', text: 'text-purple-300', border: 'border-purple-700/55', dot: 'bg-purple-400' },
  PAUSADO: { label: 'Pausado', bg: 'bg-zinc-800/80', text: 'text-zinc-300', border: 'border-zinc-600/70', dot: 'bg-zinc-400' },
  CONCLUIDO: { label: 'Concluído', bg: 'bg-teal-950/45', text: 'text-teal-300', border: 'border-teal-700/55', dot: 'bg-teal-400' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-rose-950/35', text: 'text-rose-300', border: 'border-rose-800/60', dot: 'bg-rose-500' },
  BLOQUEADO: { label: 'Bloqueado', bg: 'bg-red-950/50', text: 'text-red-300', border: 'border-red-700/60', dot: 'bg-red-500' },
  ACTIVE: { label: 'Ativo', bg: 'bg-emerald-950/45', text: 'text-emerald-300', border: 'border-emerald-700/55', dot: 'bg-emerald-400' },
  PAUSED: { label: 'Pausado', bg: 'bg-amber-950/45', text: 'text-amber-300', border: 'border-amber-700/55', dot: 'bg-amber-400' },
  ENDED: { label: 'Encerrado', bg: 'bg-zinc-800/70', text: 'text-zinc-400', border: 'border-zinc-700', dot: 'bg-zinc-500' },
  ATIVO: { label: 'Ativo', bg: 'bg-emerald-950/45', text: 'text-emerald-300', border: 'border-emerald-700/55', dot: 'bg-emerald-400' },
  ONBOARDING: { label: 'Onboarding', bg: 'bg-sky-950/45', text: 'text-sky-300', border: 'border-sky-700/55', dot: 'bg-sky-400' },
  EM_RENOVACAO: { label: 'Em renovação', bg: 'bg-amber-950/45', text: 'text-amber-300', border: 'border-amber-700/55', dot: 'bg-amber-400' }
};

const FALLBACK_STATUS: StatusVisualConfig = {
  label: 'Status', bg: 'bg-zinc-800/70', text: 'text-zinc-300', border: 'border-zinc-700', dot: 'bg-zinc-400'
};

export function getStatusVisual(status: string): StatusVisualConfig {
  return STATUS_VISUALS[status] || { ...FALLBACK_STATUS, label: status };
}

export function getProjectStatusOptions(
  statuses: ProjectStatusDefinition[],
  current?: { value: string; label?: string; color?: string }
): Array<{ value: string; label: string; color: string }> {
  const options = statuses
    .filter(status => status.active || status.id === current?.value)
    .map(status => ({ value: status.id, label: status.name, color: status.color }));
  if (current && !options.some(option => option.value === current.value)) {
    options.push({ value: current.value, label: current.label || current.value, color: current.color || '#71717a' });
  }
  return options;
}

export function getWorkflowStatusOptions(
  statuses: ProductStatusDefinition[],
  current?: { value: string; label?: string; color?: string }
): Array<{ value: string; label: string; color: string }> {
  return getProjectStatusOptions(statuses, current);
}

export function isTaskCompleted(task: Pick<Task, 'statusCompleted' | 'completedAt'>): boolean {
  return Boolean(task.statusCompleted || task.completedAt);
}

export function isProjectCompleted(project: Pick<Project, 'statusCompleted'>): boolean {
  return Boolean(project.statusCompleted);
}

export function getCompletedWorkflowStatus(statuses?: ProductStatusDefinition[]): ProductStatusDefinition | undefined {
  return statuses?.find(status => status.active && status.isCompleted) || statuses?.find(status => status.isCompleted);
}

export function getOpenWorkflowStatus(statuses?: ProductStatusDefinition[]): ProductStatusDefinition | undefined {
  return statuses?.find(status => status.active && !status.isCompleted) || statuses?.find(status => !status.isCompleted);
}

export const PRIORITY_OPTIONS: Array<{ value: Priority } & PriorityVisualConfig> = [
  { value: 'URGENTE', label: 'Urgente', color: 'text-rose-400', surface: 'border-rose-700/55 bg-rose-950/40' },
  { value: 'ALTA', label: 'Alta', color: 'text-orange-400', surface: 'border-orange-700/55 bg-orange-950/35' },
  { value: 'NORMAL', label: 'Normal', color: 'text-sky-400', surface: 'border-sky-700/45 bg-sky-950/30' },
  { value: 'BAIXA', label: 'Baixa', color: 'text-zinc-400', surface: 'border-zinc-700 bg-zinc-800/55' }
];

export function getPriorityVisual(priority: Priority): PriorityVisualConfig {
  return PRIORITY_OPTIONS.find(option => option.value === priority) || PRIORITY_OPTIONS[2];
}
