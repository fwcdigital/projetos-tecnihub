import React, { useState, useMemo } from 'react';
import { Client, Priority, Project, Task, User } from '../types';
import { TaskRow } from '../components/TaskRow';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import { 
  Search, 
  Filter, 
  CheckSquare, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ChevronDown, 
  Repeat, 
  User as UserIcon, 
  Building2, 
  FolderKanban, 
  SlidersHorizontal, 
  Layers, 
  List, 
  Kanban, 
  Plus,
  ArrowUpDown,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { GroupHeader, GroupedSections, GroupingSwitcher, groupTasks, usePersistentGrouping } from '../components/GroupingSwitcher';
import { UserAvatar } from '../components/UserAvatar';

interface MyWorkViewProps {
  currentUser: User;
  tasks: Task[];
  completedTasks: Task[];
  projects: Project[];
  clients: Client[];
  users: User[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onUpdateTask: (task: Task) => void;
  onOpenNewTask: () => void;
}

export const MyWorkView: React.FC<MyWorkViewProps> = ({
  currentUser,
  tasks,
  completedTasks,
  projects,
  clients,
  users,
  onSelectTask,
  onToggleComplete,
  onUpdateTask,
  onOpenNewTask
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [viewMode, setViewMode] = useState<'PROJECTS' | 'LIST' | 'TABLE' | 'KANBAN'>('PROJECTS');
  const [grouping, setGrouping] = usePersistentGrouping('tecnihub:grouping:tasks', 'type');
  const [overdueGrouping, setOverdueGrouping] = usePersistentGrouping('tecnihub:grouping:tasks:overdue', 'date');
  const [todayGrouping, setTodayGrouping] = usePersistentGrouping('tecnihub:grouping:tasks:today', 'date');
  const [tomorrowGrouping, setTomorrowGrouping] = usePersistentGrouping('tecnihub:grouping:tasks:tomorrow', 'date');
  const [upcomingGrouping, setUpcomingGrouping] = usePersistentGrouping('tecnihub:grouping:tasks:upcoming', 'date');

  const dateKey = (daysAhead: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  };
  const formatLongDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).toLocaleUpperCase('pt-BR');
  const todayStr = dateKey(0);
  const tomorrowStr = dateKey(1);
  const dayAfterTomorrowStr = dateKey(2);
  const thirdDayStr = dateKey(3);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(term);
        const matchesClient = task.clientName.toLowerCase().includes(term);
        const matchesProject = task.projectName.toLowerCase().includes(term);
        const matchesAssignee = task.assigneeName.toLowerCase().includes(term);
        if (!matchesTitle && !matchesClient && !matchesProject && !matchesAssignee) {
          return false;
        }
      }

      // Assignee Filter
      if (selectedAssignee !== 'ALL' && !task.participantIds.includes(selectedAssignee)) {
        return false;
      }

      // Client Filter
      if (selectedClient !== 'ALL' && task.clientId !== selectedClient) {
        return false;
      }

      // Project Filter
      if (selectedProject !== 'ALL' && task.projectId !== selectedProject) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL' && task.status !== selectedStatus) {
        return false;
      }

      // Priority Filter
      if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
        return false;
      }

      // Only Overdue
      if (onlyOverdue && (task.dueDate >= todayStr || task.statusCompleted)) {
        return false;
      }

      // Only Recurring
      if (onlyRecurring && !task.isRecurring) {
        return false;
      }

      return true;
    });
  }, [
    tasks, 
    searchTerm, 
    selectedAssignee, 
    selectedClient, 
    selectedProject, 
    selectedStatus, 
    selectedPriority, 
    onlyOverdue, 
    onlyRecurring, 
    todayStr
  ]);

  const filteredCompletedTasks = useMemo(() => {
    if (onlyOverdue) return [];

    return completedTasks.filter(task => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (![task.title, task.clientName, task.projectName, task.assigneeName]
          .some(value => value.toLowerCase().includes(term))) return false;
      }
      if (selectedAssignee !== 'ALL' && !task.participantIds.includes(selectedAssignee)) return false;
      if (selectedClient !== 'ALL' && task.clientId !== selectedClient) return false;
      if (selectedProject !== 'ALL' && task.projectId !== selectedProject) return false;
      if (selectedStatus !== 'ALL' && task.status !== selectedStatus) return false;
      if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) return false;
      if (onlyRecurring && !task.isRecurring) return false;
      return true;
    });
  }, [
    completedTasks,
    searchTerm,
    selectedAssignee,
    selectedClient,
    selectedProject,
    selectedStatus,
    selectedPriority,
    onlyOverdue,
    onlyRecurring
  ]);

  // Group Chronologically (ClickUp & Linear style)
  const overdueTasks = filteredTasks.filter(t => t.dueDate < todayStr && !t.statusCompleted);
  const todayTasks = filteredTasks.filter(t => t.dueDate === todayStr);
  const tomorrowTasks = filteredTasks.filter(t => t.dueDate === tomorrowStr);
  const nextDaysTasks = filteredTasks.filter(t => t.dueDate > tomorrowStr);
  const groupedTasks = useMemo(() => groupTasks(filteredTasks, grouping, projects), [filteredTasks, grouping, projects]);
  const renderGroupedRows = (items: Task[], mode: typeof grouping, emptyMessage?: string) => <GroupedSections groups={groupTasks(items, mode, projects)} emptyMessage={emptyMessage} renderItem={task => <TaskRow key={task.id} task={task} onSelectTask={onSelectTask} onToggleComplete={onToggleComplete} onUpdateTask={onUpdateTask} projects={projects} />} />;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAssignee('ALL');
    setSelectedClient('ALL');
    setSelectedProject('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setOnlyOverdue(false);
    setOnlyRecurring(false);
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    selectedAssignee !== 'ALL' || 
    selectedClient !== 'ALL' || 
    selectedProject !== 'ALL' || 
    selectedStatus !== 'ALL' || 
    selectedPriority !== 'ALL' || 
    onlyOverdue || 
    onlyRecurring;

  return (
    <div className="mx-auto max-w-[1800px] space-y-5 p-4 animate-in fade-in duration-150 sm:p-6">
      {/* Top Header & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Tarefas
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visão geral por projeto, com subtarefas e checklists expansíveis na própria lista.
          </p>
        </div>

        {/* View Switcher & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <GroupingSwitcher value={grouping} onChange={setGrouping} />
          {/* List / Table / Kanban View Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => setViewMode('PROJECTS')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'PROJECTS' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderKanban size={14} />
              <span>Por projeto</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'LIST' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List size={14} />
              <span>Cronológico</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'TABLE' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers size={14} />
              <span>Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'KANBAN' ? 'bg-zinc-800 text-white font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Kanban size={14} />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>+ Tarefa</span>
          </button>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div className="p-3 rounded-xl bg-[#121216] border border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filtrar por nome, cliente, projeto ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Filter: Responsável */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">👤 Todos os Responsáveis</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Filter: Cliente */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">🏢 Todos os Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filter: Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">⚡ Todos os Status</option>
            {[...new Map([...tasks, ...completedTasks].map(task => [task.status, task])).values()].map(task => <option key={task.status} value={task.status}>{task.statusName || task.status}</option>)}
          </select>

          {/* Filter: Prioridade */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">🎯 Todas as Prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="NORMAL">Normal</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>

        {/* Secondary Toggles & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2">
            {/* Toggle Apenas Atrasadas */}
            <button
              onClick={() => setOnlyOverdue(!onlyOverdue)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                onlyOverdue
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <AlertTriangle size={12} className={onlyOverdue ? 'text-rose-400' : 'text-zinc-500'} />
              <span>Apenas Atrasadas</span>
            </button>

            {/* Toggle Apenas Recorrentes */}
            <button
              onClick={() => setOnlyRecurring(!onlyRecurring)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                onlyRecurring
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Repeat size={12} className={onlyRecurring ? 'text-emerald-400' : 'text-zinc-500'} />
              <span>Apenas Recorrências (Fixos)</span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-zinc-400 hover:text-zinc-200 underline text-[11px]"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {viewMode === 'PROJECTS' && (
        <GroupedSections<Task> groups={groupedTasks} emptyMessage="Nenhuma tarefa encontrada com os filtros selecionados." renderItem={task => <TaskRow key={task.id} task={task} onSelectTask={onSelectTask} onToggleComplete={onToggleComplete} onUpdateTask={onUpdateTask} projects={projects} />} />
      )}

      {/* VIEW MODE 1: CHRONOLOGICAL LIST (The Core ClickUp Experience) */}
      {viewMode === 'LIST' && (
        <div className="space-y-6">
          {/* 1. ATRASADAS */}
          {overdueTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 py-1 border-b border-rose-900/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    ATRASADAS ({overdueTasks.length})
                  </h2>
                </div>
                <GroupingSwitcher value={overdueGrouping} onChange={setOverdueGrouping} label="Agrupar atrasadas por:" />
              </div>

              {renderGroupedRows(overdueTasks, overdueGrouping)}
            </div>
          )}

          {/* 2. HOJE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 py-1 border-b border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  HOJE • {formatLongDate(todayStr)} ({todayTasks.length})
                </h2>
              </div>
              <GroupingSwitcher value={todayGrouping} onChange={setTodayGrouping} label="Agrupar hoje por:" />
            </div>

            {todayTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center text-xs text-zinc-500">
                Nenhuma tarefa agendada para hoje com os filtros selecionados.
              </div>
            ) : (
              renderGroupedRows(todayTasks, todayGrouping)
            )}
          </div>

          {/* 3. AMANHÃ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 py-1 border-b border-sky-500/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-sky-300">
                  AMANHÃ • {formatLongDate(tomorrowStr)} ({tomorrowTasks.length})
                </h2>
              </div>
              <GroupingSwitcher value={tomorrowGrouping} onChange={setTomorrowGrouping} label="Agrupar amanhã por:" />
            </div>

            {tomorrowTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center text-xs text-zinc-500">
                Nenhuma tarefa para amanhã.
              </div>
            ) : (
              renderGroupedRows(tomorrowTasks, tomorrowGrouping)
            )}
          </div>

          {/* 4. PRÓXIMOS DIAS */}
          {nextDaysTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 py-1 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-purple-300">
                    PRÓXIMOS DIAS ({nextDaysTasks.length})
                  </h2>
                </div>
                <GroupingSwitcher value={upcomingGrouping} onChange={setUpcomingGrouping} label="Agrupar próximos dias por:" />
              </div>
              {renderGroupedRows(nextDaysTasks, upcomingGrouping)}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE VIEW */}
      {viewMode === 'TABLE' && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#121216]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16161c] text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Tarefa</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Projeto</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Prazo</th>
                <th className="p-3">Prioridade</th>
                <th className="p-3">Status</th>
                <th className="p-3">Recorrente</th>
              </tr>
            </thead>
            {groupedTasks.map(group => <tbody key={group.key} className="divide-y divide-zinc-800/60">
              <tr><td colSpan={8} className="bg-zinc-950/60 p-2"><GroupHeader group={group} count={group.items.length} /></td></tr>
              {group.items.map(task => (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-medium text-zinc-100 truncate max-w-[240px]">
                    {task.title}
                  </td>
                  <td className="p-3 text-zinc-300">{task.clientName}</td>
                  <td className="p-3 text-zinc-400">{task.projectName}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name={task.assigneeName} src={task.assigneeAvatar} className="h-5 w-5" />
                      <span className="text-zinc-200">{task.assigneeName.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-zinc-300">
                    {task.dueDate.split('-').reverse().slice(0, 2).join('/')} {task.dueTime || ''}
                  </td>
                  <td className="p-3">
                    <PriorityBadge priority={task.priority} size="sm" />
                  </td>
                  <td className="p-3">
                    <StatusBadge status={task.status} label={task.statusName} color={task.statusColor} size="sm" />
                  </td>
                  <td className="p-3 text-zinc-400">
                    {task.isRecurring ? 'Sim' : 'Não'}
                  </td>
                </tr>
              ))}
            </tbody>)}
          </table>
        </div>
      )}

      {/* VIEW MODE 3: KANBAN BOARD */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {groupedTasks.map(group => (
              <div key={group.key} className="bg-[#121216] border border-zinc-800 rounded-xl p-3 flex flex-col min-h-[300px]">
                <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
                  <GroupHeader group={group} count={group.items.length} />
                </div>

                <div className="space-y-2.5 flex-1">
                  {group.items.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="p-3 rounded-lg bg-[#181820] border border-zinc-800 hover:border-zinc-700 cursor-pointer shadow-xs transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400">{task.clientName}</span>
                        <PriorityBadge priority={task.priority} size="sm" />
                      </div>
                      <p className="text-xs font-medium text-zinc-100">{task.title}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px] text-zinc-400">
                        <span>{task.dueDate.split('-').reverse().slice(0, 2).join('/')}</span>
                        <UserAvatar name={task.assigneeName} src={task.assigneeAvatar} className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          ))}
        </div>
      )}

      <CompletedTasksSection
        tasks={filteredCompletedTasks}
        onSelectTask={onSelectTask}
        onToggleComplete={onToggleComplete}
        onUpdateTask={onUpdateTask}
        projects={projects}
        contextKey={`${selectedAssignee}:${selectedClient}:${selectedProject}`}
      />
    </div>
  );
};
