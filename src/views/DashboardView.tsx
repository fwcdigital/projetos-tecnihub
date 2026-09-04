import React, { useState } from 'react';
import { Client, OperationalViewMode, Project, ProjectStatusDefinition, Task, User } from '../types';
import { TaskRow } from '../components/TaskRow';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import { 
  CheckSquare, 
  AlertTriangle, 
  CalendarDays, 
  FolderKanban, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock, 
  Plus,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Loader2
} from 'lucide-react';
import { isProjectCompleted } from '../components/visualTokens';
import { GroupedSections, GroupingSwitcher, groupTasks, usePersistentGrouping } from '../components/GroupingSwitcher';

interface DashboardViewProps {
  currentUser: User;
  operationalView: OperationalViewMode;
  tasks: Task[];
  completedTasks: Task[];
  projects: Project[];
  projectStatuses: ProjectStatusDefinition[];
  clients: Client[];
  users: User[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onUpdateTask: (task: Task) => void;
  onNavigate: (view: any) => void;
  onOpenNewTask: () => void;
  onOpenNewProject: () => void;
  onUpdateProject: (project: Project, updates: Partial<Project>, teamUserIds?: string[]) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  operationalView,
  tasks,
  completedTasks,
  projects,
  projectStatuses,
  clients,
  users,
  onSelectTask,
  onToggleComplete,
  onUpdateTask,
  onNavigate,
  onOpenNewTask,
  onOpenNewProject,
  onUpdateProject
}) => {
  const dateKey = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  };
  const addDays = (days: number) => new Date(Date.now() + days * 86_400_000);
  const todayStr = dateKey(new Date());
  const tomorrowDate = addDays(1);
  const dayAfterTomorrowDate = addDays(2);
  const thirdDayDate = addDays(3);
  const tomorrowKey = dateKey(tomorrowDate);
  const dayAfterTomorrowKey = dateKey(dayAfterTomorrowDate);
  const thirdDayKey = dateKey(thirdDayDate);
  const dateLabel = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' });

  // Load more / Expand upcoming tasks state
  const [showMoreUpcoming, setShowMoreUpcoming] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [grouping, setGrouping] = usePersistentGrouping('dashboard.groupBy', 'date');

  // Overdue Tasks
  const overdueTasks = tasks.filter(t => t.dueDate < todayStr && !t.statusCompleted);
  // Today Tasks
  const todayTasks = tasks.filter(t => t.dueDate === todayStr && !t.statusCompleted);
  // Tomorrow Tasks
  const tomorrowTasks = tasks.filter(t => t.dueDate === tomorrowKey);
  const day03Tasks = tasks.filter(t => t.dueDate === dayAfterTomorrowKey);
  const day04Tasks = tasks.filter(t => t.dueDate === thirdDayKey);
  // Next Days Tasks
  const nextDaysTasks = tasks.filter(t => t.dueDate > thirdDayKey);
  const allNextDaysTasks = tasks.filter(t => t.dueDate > tomorrowKey);
  
  // Total future tasks beyond tomorrow
  const futureTasksCount = day03Tasks.length + day04Tasks.length + nextDaysTasks.length;

  // Upcoming Next 7 Days
  const upcomingTasks = tasks.filter(t => t.dueDate > todayStr && t.dueDate <= dateKey(addDays(7)) && !t.statusCompleted);
  // Active Projects
  const activeProjects = projects.filter(project => !isProjectCompleted(project));
  const renderGroupedRows = (items: Task[]) => <GroupedSections groups={groupTasks(items, grouping, projects)} renderItem={task => <TaskRow key={task.id} task={task} onSelectTask={onSelectTask} onToggleComplete={onToggleComplete} onUpdateTask={onUpdateTask} projects={projects} layout="STACKED" />} />;
  const handleToggleLoadMore = () => {
    if (!showMoreUpcoming) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setShowMoreUpcoming(true);
        setIsLoadingMore(false);
      }, 150);
    } else {
      setShowMoreUpcoming(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 p-4 animate-in fade-in duration-200 sm:p-6">
      {/* Top Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Bom dia, {currentUser.name.split(' ')[0]} 👋
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Operação Online
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Aqui está a visão consolidada das demandas da agência para hoje, 01 de Setembro de 2026.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('MEU_TRABALHO')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
          >
            <CheckSquare size={14} className="text-emerald-400" />
            <span>Meu Trabalho</span>
          </button>
          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>Criar Tarefa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Resumo Rápido e Objetivo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Tarefas Hoje */}
        <div 
          onClick={() => onNavigate('MEU_TRABALHO')}
          className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Hoje</span>
            <Clock size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{todayTasks.length}</span>
            <span className="text-[11px] text-zinc-400">tarefas</span>
          </div>
          <span className="text-[10px] text-amber-400/90 mt-1 block truncate">
            Próxima: 09:00 (Ads Martins)
          </span>
        </div>

        {/* Card 2: Atrasadas */}
        <div 
          onClick={() => onNavigate('MEU_TRABALHO')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all group ${
            overdueTasks.length > 0
              ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60 hover:bg-rose-950/30'
              : 'bg-[#121216] border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Atrasadas</span>
            <AlertTriangle size={15} className="text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-300">{overdueTasks.length}</span>
            <span className="text-[11px] text-rose-400/80">críticas</span>
          </div>
          <span className="text-[10px] text-rose-400 mt-1 block truncate">
            {overdueTasks.length > 0 ? 'Ação imediata necessária' : 'Tudo em dia!'}
          </span>
        </div>

        {/* Card 3: Próximas */}
        <div 
          onClick={() => onNavigate('MEU_TRABALHO')}
          className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Próximos 7 Dias</span>
            <CalendarDays size={15} className="text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{upcomingTasks.length}</span>
            <span className="text-[11px] text-zinc-400">programadas</span>
          </div>
          <span className="text-[10px] text-sky-400/90 mt-1 block truncate">
            4 entregas de clientes
          </span>
        </div>

        {/* Card 4: Projetos Ativos */}
        <div 
          onClick={() => onNavigate('PROJETOS')}
          className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] group"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Projetos Ativos</span>
            <FolderKanban size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{activeProjects.length}</span>
            <span className="text-[11px] text-zinc-400">em curso</span>
          </div>
          <span className="text-[10px] text-purple-400/90 mt-1 block truncate">
            {projects.filter(p => p.isRecurring).length} contratos recorrentes
          </span>
        </div>

        {/* Card 5: Concluídas */}
        <div 
          onClick={() => onNavigate('MEU_TRABALHO')}
          className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Concluídas</span>
            <CheckCircle2 size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{completedTasks.length}</span>
            <span className="text-[11px] text-zinc-400">entregas</span>
          </div>
          <span className="text-[10px] text-emerald-400/90 mt-1 block truncate">
            96.4% taxa no prazo
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end border-b border-zinc-800/80 pb-3">
        <GroupingSwitcher value={grouping} onChange={setGrouping} />
      </div>

      <div className="min-w-0 space-y-6">
          {/* Section: Atrasadas */}
          {overdueTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Atrasadas ({overdueTasks.length})
                  </h2>
                </div>
              </div>

              {renderGroupedRows(overdueTasks)}
            </div>
          )}

          {/* Section: Hoje */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Programadas Para Hoje ({todayTasks.length})
                </h2>
              </div>
            </div>

            {renderGroupedRows(todayTasks)}
          </div>

          {/* Section: Amanhã */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Amanhã ({tomorrowDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })})
                </h2>
              </div>
            </div>

            {renderGroupedRows(tomorrowTasks)}
          </div>

          {/* Expandable Next Tasks Sections */}
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-purple-400" /><h2 className="text-xs font-bold uppercase tracking-wider text-purple-300">Próximos Dias ({allNextDaysTasks.length})</h2></div></div>
          {showMoreUpcoming && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-3 duration-200">
              {renderGroupedRows(allNextDaysTasks)}
            </div>
          )}

          {/* Load More / Próximas Tarefas Button */}
          <div className="pt-2">
            {!showMoreUpcoming ? (
              <button
                onClick={handleToggleLoadMore}
                disabled={isLoadingMore}
                className="w-full group flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#121216] hover:bg-[#181820] border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all shadow-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                    <span className="text-xs font-bold">Carregando próximas tarefas...</span>
                  </>
                ) : (
                  <>
                    <ListPlus size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold">Carregar mais tarefas (Próximas tarefas)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono font-bold">
                      +{futureTasksCount} tarefas
                    </span>
                    <ChevronDown size={14} className="text-zinc-500 group-hover:text-zinc-300 ml-0.5" />
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[#121216] border border-zinc-800">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  Todas as próximas tarefas ({futureTasksCount}) foram carregadas
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleLoadMore}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
                  >
                    <ChevronUp size={14} />
                    <span>Mostrar menos</span>
                  </button>

                  <button
                    onClick={() => onNavigate('MEU_TRABALHO')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold transition-colors"
                  >
                    <span>Ver cronograma completo</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <CompletedTasksSection
            tasks={completedTasks}
            onSelectTask={onSelectTask}
            onToggleComplete={onToggleComplete}
            onUpdateTask={onUpdateTask}
            projects={projects}
            contextKey="dashboard"
            taskLayout="STACKED"
          />
      </div>

    </div>
  );
};
