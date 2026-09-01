import React, { useState } from 'react';
import { Client, Project, Task, User } from '../types';
import { TaskRow } from '../components/TaskRow';
import { 
  CheckSquare, 
  AlertTriangle, 
  CalendarDays, 
  FolderKanban, 
  CheckCircle2, 
  ArrowUpRight, 
  Clock, 
  Repeat, 
  Sparkles,
  TrendingUp,
  Building2,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Loader2,
  Calendar
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

interface DashboardViewProps {
  currentUser: User;
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  users: User[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onNavigate: (view: any) => void;
  onOpenNewTask: () => void;
  onOpenNewProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  tasks,
  projects,
  clients,
  users,
  onSelectTask,
  onToggleComplete,
  onNavigate,
  onOpenNewTask,
  onOpenNewProject
}) => {
  const todayStr = '2026-09-01';

  // Load more / Expand upcoming tasks state
  const [showMoreUpcoming, setShowMoreUpcoming] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Overdue Tasks
  const overdueTasks = tasks.filter(t => t.dueDate < todayStr && t.status !== 'CONCLUIDO');
  // Today Tasks
  const todayTasks = tasks.filter(t => t.dueDate === todayStr && t.status !== 'CONCLUIDO');
  // Tomorrow Tasks
  const tomorrowTasks = tasks.filter(t => t.dueDate === '2026-09-02');
  // 03 Set Tasks
  const day03Tasks = tasks.filter(t => t.dueDate === '2026-09-03');
  // 04 Set Tasks
  const day04Tasks = tasks.filter(t => t.dueDate === '2026-09-04');
  // Next Days Tasks
  const nextDaysTasks = tasks.filter(t => t.dueDate > '2026-09-04');
  
  // Total future tasks beyond tomorrow
  const futureTasksCount = day03Tasks.length + day04Tasks.length + nextDaysTasks.length;

  // Upcoming Next 7 Days
  const upcomingTasks = tasks.filter(t => t.dueDate > todayStr && t.dueDate <= '2026-09-08' && t.status !== 'CONCLUIDO');
  // Active Projects
  const activeProjects = projects.filter(p => p.status === 'EM_ANDAMENTO' || p.status === 'PLANEJAMENTO');
  // Completed Tasks count
  const completedTasks = tasks.filter(t => t.status === 'CONCLUIDO');

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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
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

      {/* Main Grid: Left Operational Focus & Right Agency Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Demandas Críticas e Hoje */}
        <div className="lg:col-span-2 space-y-6">
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
                <span className="text-[11px] text-rose-400/80">Prioridade imediata</span>
              </div>

              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onSelectTask={onSelectTask}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </div>
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
              <button
                onClick={() => onNavigate('MEU_TRABALHO')}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Ver cronograma completo</span>
                <ArrowUpRight size={12} />
              </button>
            </div>

            <div className="space-y-2">
              {todayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>

          {/* Section: Amanhã */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Amanhã (02 de Setembro)
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              {tomorrowTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>

          {/* Expandable Next Tasks Sections */}
          {showMoreUpcoming && (
            <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-3 duration-200">
              {/* Section: 03 de Setembro */}
              {day03Tasks.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                        03 de Setembro (Quarta-feira)
                      </h2>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{day03Tasks.length} {day03Tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                  </div>

                  <div className="space-y-2">
                    {day03Tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section: 04 de Setembro */}
              {day04Tasks.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                        04 de Setembro (Quinta-feira)
                      </h2>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{day04Tasks.length} {day04Tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                  </div>

                  <div className="space-y-2">
                    {day04Tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Próximos Dias */}
              {nextDaysTasks.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        Próximos Dias (Semana seguinte)
                      </h2>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{nextDaysTasks.length} {nextDaysTasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                  </div>

                  <div className="space-y-2">
                    {nextDaysTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                      />
                    ))}
                  </div>
                </div>
              )}
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
        </div>

        {/* Right 1 Col: Status dos Projetos e Recorrências */}
        <div className="space-y-6">
          {/* Projetos em Andamento Card */}
          <div className="p-4 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FolderKanban size={15} className="text-sky-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Andamento dos Projetos
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('PROJETOS')}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Ver todos ({projects.length})
              </button>
            </div>

            <div className="space-y-3.5">
              {projects.slice(0, 4).map((proj) => (
                <div key={proj.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                      <span className="font-semibold text-zinc-200 truncate">{proj.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-zinc-300">{proj.progress}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        proj.progress >= 80 ? 'bg-emerald-500' : proj.progress >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                    <span>{proj.clientName} • Gestor: {proj.managerName.split(' ')[0]}</span>
                    <span>Prazo: {proj.dueDate.split('-').reverse().slice(0, 2).join('/')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recorrências Fixas da Semana */}
          <div className="p-4 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Repeat size={15} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Rotinas & Recorrências
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('RECORRENCIAS')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Gerenciar
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-200">Gestão Google Ads</p>
                  <p className="text-[11px] text-zinc-400">Clínica Horizonte • Toda seg 09h</p>
                  <span className="text-[10px] text-zinc-500">Resp: Caio Rocha</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Semanal
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-200">Relatório Mensal</p>
                  <p className="text-[11px] text-zinc-400">Advocacia Martins • Todo dia 05</p>
                  <span className="text-[10px] text-zinc-500">Resp: Caio Rocha</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Mensal
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-200">Backup & Update WordPress</p>
                  <p className="text-[11px] text-zinc-400">Indústria Atlas • Quinzenal</p>
                  <span className="text-[10px] text-zinc-500">Resp: Gabriel Menezes</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Quinzenal
                </span>
              </div>
            </div>
          </div>

          {/* Equipe Online / Disponibilidade */}
          <div className="p-4 rounded-2xl bg-[#121216] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-amber-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Equipe & Carga
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('EQUIPE')}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Ver equipe
              </button>
            </div>

            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover border border-zinc-700" />
                      <span className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full border border-black ${
                        u.status === 'ONLINE' ? 'bg-emerald-400' : u.status === 'FOCO' ? 'bg-purple-400' : 'bg-amber-400'
                      }`} />
                    </div>
                    <span className="font-medium text-zinc-300">{u.name}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {u.currentTasksCount} tarefas
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
