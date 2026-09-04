import React, { useEffect, useState } from 'react';
import { CalendarDays, CircleDot, Shapes } from 'lucide-react';
import { ProductStatusDefinition, Project, ProjectStatusDefinition, Task } from '../types';

export type GroupingMode = 'type' | 'date' | 'status';

export interface GroupedItems<T> {
  key: string;
  label: string;
  color?: string;
  dotClass?: string;
  items: T[];
}

interface GroupingSwitcherProps {
  value: GroupingMode;
  onChange: (mode: GroupingMode) => void;
  label?: string;
}

const options = [
  { value: 'type' as const, label: 'Tipo', icon: Shapes },
  { value: 'date' as const, label: 'Data', icon: CalendarDays },
  { value: 'status' as const, label: 'Status', icon: CircleDot }
];

export const GroupingSwitcher: React.FC<GroupingSwitcherProps> = ({ value, onChange, label = 'Agrupar por:' }) => (
  <div className="inline-flex items-center gap-1.5" aria-label={label}>
    <span className="hidden text-[10px] font-semibold text-zinc-500 lg:inline">{label}</span>
    <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
      {options.map(option => {
        const Icon = option.icon;
        return <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} title={`Agrupar por ${option.label.toLowerCase()}`} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${value === option.value ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}><Icon size={11} /><span>{option.label}</span></button>;
      })}
    </div>
  </div>
);

export const GroupHeader: React.FC<{ group: Pick<GroupedItems<unknown>, 'label' | 'color' | 'dotClass'>; count: number }> = ({ group, count }) => (
  <div className="flex items-center gap-2 border-b border-zinc-800/80 px-1 pb-1.5">
    <span className={`h-2 w-2 rounded-full ${group.dotClass || 'bg-zinc-500'}`} style={group.color ? { backgroundColor: group.color } : undefined} />
    <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{group.label}</h3>
    <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{count}</span>
  </div>
);

export function GroupedSections<T>({ groups, renderItem, emptyMessage }: { groups: GroupedItems<T>[]; renderItem: (item: T) => React.ReactNode; emptyMessage?: string }) {
  if (groups.length === 0) return emptyMessage ? <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-center text-xs text-zinc-500">{emptyMessage}</div> : null;
  return <div className="space-y-4">{groups.map(group => <section key={group.key} className="space-y-2"><GroupHeader group={group} count={group.items.length} /><div className="space-y-2">{group.items.map(renderItem)}</div></section>)}</div>;
}

export function usePersistentGrouping(key: string, defaultValue: GroupingMode = 'date') {
  const [value, setValue] = useState<GroupingMode>(() => {
    const stored = window.localStorage.getItem(key);
    return stored === 'type' || stored === 'date' || stored === 'status' ? stored : defaultValue;
  });
  useEffect(() => window.localStorage.setItem(key, value), [key, value]);
  return [value, setValue] as const;
}

const dateLabel = (value?: string) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Sem prazo';

function buildGroups<T>(items: T[], describe: (item: T) => Omit<GroupedItems<T>, 'items'>, compareItems?: (a: T, b: T) => number): GroupedItems<T>[] {
  const groups = new Map<string, GroupedItems<T>>();
  for (const item of items) {
    const descriptor = describe(item);
    const current = groups.get(descriptor.key) || { ...descriptor, items: [] };
    current.items.push(item);
    groups.set(descriptor.key, current);
  }
  const result = [...groups.values()];
  result.forEach(group => compareItems && group.items.sort(compareItems));
  return result;
}

export function groupTasks(tasks: Task[], mode: GroupingMode, projects: Project[]): GroupedItems<Task>[] {
  const projectById = new Map(projects.map(project => [project.id, project]));
  const chronological = (a: Task, b: Task) => `${a.dueDate} ${a.dueTime || '23:59'}`.localeCompare(`${b.dueDate} ${b.dueTime || '23:59'}`);
  if (mode === 'type') return buildGroups(tasks, task => {
    const project = projectById.get(task.projectId);
    return { key: project?.type || task.productId || 'none', label: project?.typeName || project?.type || 'Sem tipo', color: project?.typeColor };
  }, chronological).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  if (mode === 'status') return buildGroups(tasks, task => {
    return { key: task.status, label: task.statusName || task.status, color: task.statusColor };
  }, chronological);
  return buildGroups(tasks, task => ({ key: task.dueDate || 'none', label: dateLabel(task.dueDate) }), chronological)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function groupProjects(projects: Project[], mode: GroupingMode, statuses: Array<ProjectStatusDefinition | ProductStatusDefinition>): GroupedItems<Project>[] {
  const statusById = new Map(statuses.map(status => [status.id, status]));
  const chronological = (a: Project, b: Project) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
  if (mode === 'type') return buildGroups(projects, project => {
    return { key: project.type, label: project.typeName || project.type, color: project.typeColor };
  }, chronological).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  if (mode === 'status') return buildGroups(projects, project => {
    const status = statusById.get(project.status);
    return { key: project.status, label: status?.name || project.statusName || project.status, color: status?.color || project.statusColor };
  }, chronological);
  return buildGroups(projects, project => ({ key: project.dueDate || 'none', label: dateLabel(project.dueDate) }), chronological)
    .sort((a, b) => a.key.localeCompare(b.key));
}
