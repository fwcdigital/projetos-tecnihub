import assert from 'node:assert/strict';
import test from 'node:test';
import { groupProjects, groupTasks } from '../src/components/GroupingSwitcher.js';
import type { Project, ProjectStatusDefinition, Task } from '../src/types.js';

const projects = [
  { id: 'p-site', type: 'SITE', typeName: 'Site', status: 'planning', statusName: 'Planejamento', statusColor: '#6366f1', dueDate: '2026-09-20' },
  { id: 'p-ads', type: 'PAID_TRAFFIC', typeName: 'Tráfego Pago', status: 'active', statusName: 'Em andamento', statusColor: '#10b981', dueDate: '2026-09-10' }
] as Project[];

const tasks = [
  { id: 'late-site', projectId: 'p-site', dueDate: '2026-09-03', dueTime: '14:00', status: 'EM_REVISAO' },
  { id: 'late-ads', projectId: 'p-ads', dueDate: '2026-09-02', dueTime: '09:00', status: 'A_FAZER' },
  { id: 'today-site', projectId: 'p-site', dueDate: '2026-09-04', dueTime: '08:00', status: 'A_FAZER' }
] as Task[];

test('agrupamento de tarefas apenas reorganiza o conjunto autorizado', () => {
  for (const mode of ['type', 'date', 'status'] as const) {
    const groupedIds = groupTasks(tasks, mode, projects).flatMap(group => group.items.map(task => task.id)).sort();
    assert.deepEqual(groupedIds, tasks.map(task => task.id).sort());
  }
  assert.deepEqual(groupTasks(tasks, 'date', projects).flatMap(group => group.items.map(task => task.id)), ['late-ads', 'late-site', 'today-site']);
});

test('bloco temporal permanece estável antes de aplicar tipo, data ou status', () => {
  const overdue = tasks.filter(task => task.dueDate < '2026-09-04');
  for (const mode of ['type', 'date', 'status'] as const) {
    assert.deepEqual(groupTasks(overdue, mode, projects).flatMap(group => group.items.map(task => task.id)).sort(), ['late-ads', 'late-site']);
  }
});

test('projetos usam tipos reais, datas estruturais e status configurados', () => {
  const statuses = [
    { id: 'planning', name: 'Planejamento', color: '#6366f1', active: true },
    { id: 'active', name: 'Em andamento', color: '#10b981', active: true }
  ] as ProjectStatusDefinition[];
  assert.deepEqual(groupProjects(projects, 'type', statuses).map(group => group.label), ['Site', 'Tráfego Pago']);
  assert.deepEqual(groupProjects(projects, 'date', statuses).flatMap(group => group.items.map(project => project.id)), ['p-ads', 'p-site']);
  assert.deepEqual(groupProjects(projects, 'status', statuses).map(group => group.color), ['#6366f1', '#10b981']);
});
