import React, { useEffect, useState } from 'react';
import { Project, Task, User, Client } from '../types';
import { TaskRow } from '../components/TaskRow';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { 
  ArrowLeft, 
  Plus, 
  Building2, 
  Calendar, 
  User as UserIcon, 
  Users, 
  Repeat, 
  CheckSquare, 
  FolderKanban, 
  Clock, 
  FileText, 
  Sparkles,
  Layers,
  Kanban
} from 'lucide-react';
import { Pencil, Save } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  completedTasks: Task[];
  onBack: () => void;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onOpenNewTask: () => void;
  currentUser: User;
  onOpenEditProject?: () => void;
  onSaveBriefing: (briefing: Record<string, string>) => Promise<void>;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  tasks,
  completedTasks,
  onBack,
  onSelectTask,
  onToggleComplete,
  onOpenNewTask,
  currentUser,
  onOpenEditProject,
  onSaveBriefing
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODO' | 'PROGRESS' | 'DOCS'>('ALL');
  const [briefing, setBriefing] = useState<Record<string, string>>({});
  const [savingBriefing, setSavingBriefing] = useState(false);
  const canEdit = currentUser.role !== 'COLABORADOR';

  useEffect(() => {
    setBriefing({
      objective: project.briefing?.objective || project.description,
      audience: project.briefing?.audience || '',
      channels: project.briefing?.channels || '',
      technology: project.briefing?.technology || ''
    });
  }, [project]);

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const projectCompletedTasks = completedTasks.filter(t => t.projectId === project.id);
  
  const filteredTasks = projectTasks.filter(t => {
    if (activeTab === 'TODO') return t.status === 'A_FAZER' || t.status === 'BACKLOG';
    if (activeTab === 'PROGRESS') return t.status === 'EM_ANDAMENTO' || t.status === 'AGUARDANDO_CLIENTE' || t.status === 'EM_REVISAO';
    return true;
  });

  const completedCount = projectCompletedTasks.length;
  const totalTaskCount = projectTasks.length + completedCount;
  const overdueCount = projectTasks.filter(t => t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== 'CONCLUIDO').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Back Nav & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Todos os Projetos</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenEditProject && <button onClick={onOpenEditProject} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold"><Pencil size={13} />Editar projeto</button>}
          <button onClick={onOpenNewTask} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors"><Plus size={14} /><span>+ Nova tarefa</span></button>
        </div>
      </div>

      {/* Project Banner & Key Metadata */}
      <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">
                {project.clientName}
              </span>
              <StatusBadge status={project.status} size="sm" />
              {project.isRecurring && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-medium">
                  <Repeat size={10} />
                  <span>Recorrente</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Quick Metrics in Header */}
          <div className="flex items-center gap-4 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 self-start md:self-auto">
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white font-mono">{project.progress}%</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500">Concluído</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white font-mono">{completedCount}/{totalTaskCount}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500">Tarefas</span>
            </div>
          </div>
        </div>

        {/* Properties row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Gestor</span>
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <UserAvatar name={project.managerName} src={project.managerAvatar} className="w-5 h-5" />
              <span>{project.managerName}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Prazo de Entrega</span>
            <div className="flex items-center gap-1.5 font-mono text-zinc-200">
              <Calendar size={12} className="text-zinc-500" />
              <span>{project.dueDate.split('-').reverse().join('/')}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Equipe</span>
            <div className="flex items-center -space-x-1">
              {(project.teamMemberDetails || []).map(member => <UserAvatar key={member.id} name={member.name} src={member.avatar} className="w-6 h-6" title={`${member.name} — ${member.position}`} />)}
              {(project.teamMemberDetails || []).length === 0 && <span className="text-zinc-400">Sem colaboradores</span>}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Status de Risco</span>
            <span className={`font-semibold ${overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {overdueCount > 0 ? `${overdueCount} atrasada(s)` : 'Em dia'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Project Tasks */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todas ({projectTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('TODO')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'TODO' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            A Fazer ({projectTasks.filter(t => t.status === 'A_FAZER' || t.status === 'BACKLOG').length})
          </button>
          <button
            onClick={() => setActiveTab('PROGRESS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'PROGRESS' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Em Andamento ({projectTasks.filter(t => t.status === 'EM_ANDAMENTO' || t.status === 'EM_REVISAO').length})
          </button>
          <button
            onClick={() => setActiveTab('DOCS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'DOCS' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Briefing & Escopo
          </button>
        </div>
        {activeTab !== 'DOCS' && <button onClick={onOpenNewTask} className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-bold"><Plus size={13} />Nova tarefa</button>}
      </div>

      {/* Tab Content */}
      {activeTab !== 'DOCS' ? (
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#121216] border border-zinc-800 text-center text-xs text-zinc-500">
              Nenhuma tarefa encontrada para esta categoria neste projeto.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onSelectTask={onSelectTask}
                onToggleComplete={onToggleComplete}
              />
            ))
          )}
          <CompletedTasksSection
            tasks={projectCompletedTasks}
            onSelectTask={onSelectTask}
            onToggleComplete={onToggleComplete}
            contextKey={project.id}
          />
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <FileText size={16} className="text-sky-400" />
            Documentação do Escopo & Diretrizes de Criação
          </h3>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 text-zinc-300 leading-relaxed">
            {[
              ['objective', 'Objetivo Principal'], ['audience', 'Público-Alvo'],
              ['channels', 'Canais de Conversão'], ['technology', 'Stack Tecnológica']
            ].map(([key, label]) => <label key={key} className="block"><strong className="block mb-1">{label}</strong><textarea disabled={!canEdit} rows={2} value={briefing[key] || ''} onChange={event => setBriefing(previous => ({ ...previous, [key]: event.target.value }))} className="w-full bg-[#15151a] border border-zinc-700 rounded-lg p-2 text-zinc-200 disabled:border-transparent disabled:bg-transparent resize-none" /></label>)}
            {canEdit && <div className="flex justify-end"><button disabled={savingBriefing} onClick={async () => { setSavingBriefing(true); try { await onSaveBriefing(briefing); } finally { setSavingBriefing(false); } }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-zinc-950 font-bold disabled:opacity-50"><Save size={13} />{savingBriefing ? 'Salvando...' : 'Salvar briefing'}</button></div>}
          </div>
        </div>
      )}
    </div>
  );
};
