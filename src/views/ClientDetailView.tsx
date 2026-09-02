import React from 'react';
import { Client, Project, Task, User } from '../types';
import { TaskRow } from '../components/TaskRow';
import { 
  ArrowLeft, 
  Plus, 
  Building2, 
  Phone, 
  Mail, 
  User as UserIcon, 
  FolderKanban, 
  FileText, 
  Repeat,
  CheckSquare
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface ClientDetailViewProps {
  client: Client;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  onSelectProject: (project: Project) => void;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onOpenNewTask: () => void;
  onOpenNewProject?: () => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  projects,
  tasks,
  onBack,
  onSelectProject,
  onSelectTask,
  onToggleComplete,
  onOpenNewTask,
  onOpenNewProject
}) => {
  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientTasks = tasks.filter(t => t.clientId === client.id);
  const completedTasks = clientTasks.filter(t => t.status === 'CONCLUIDO').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Lista de Clientes</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenNewProject && (
            <button
              onClick={onOpenNewProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <Plus size={14} />
              <span>+ Novo Projeto</span>
            </button>
          )}
          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>+ Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Client Overview Card */}
      <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/40 text-purple-300 flex items-center justify-center font-bold text-base">
              {client.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {client.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                  Cliente Ativo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{client.company}</p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="flex items-center gap-4 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 self-start md:self-auto">
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white font-mono">{clientProjects.length}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500">Projetos</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center px-2">
              <span className="block text-lg font-black text-white font-mono">{completedTasks}/{clientTasks.length}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500">Demandas</span>
            </div>
          </div>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <UserIcon size={14} className="text-zinc-500" />
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Contato Principal</span>
              <span>{client.contactName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-300">
            <Mail size={14} className="text-zinc-500" />
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">E-mail</span>
              <span>{client.contactEmail}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-300">
            <Phone size={14} className="text-zinc-500" />
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Telefone</span>
              <span>{client.contactPhone}</span>
            </div>
          </div>
        </div>

        {/* Notes & Services */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-zinc-400">Serviços Contratados:</span>
            {client.monthlyServices.map((serv, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700">
                {serv}
              </span>
            ))}
          </div>

          {client.notes && (
            <span className="text-zinc-400 italic text-[11px] truncate max-w-sm">
              Obs: {client.notes}
            </span>
          )}
        </div>
      </div>

      {/* Projects of this Client */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <FolderKanban size={16} className="text-sky-400" />
            Projetos Ativos deste Cliente ({clientProjects.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clientProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-100">{p.name}</span>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <p className="text-xs text-zinc-400 line-clamp-1">{p.description}</p>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                <span>Progresso: {p.progress}%</span>
                <span>Prazo: {p.dueDate.split('-').reverse().join('/')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Tasks of this Client */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <CheckSquare size={16} className="text-emerald-400" />
            Histórico & Fila de Tarefas ({clientTasks.length})
          </h2>
        </div>

        <div className="space-y-2">
          {clientTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onSelectTask={onSelectTask}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
