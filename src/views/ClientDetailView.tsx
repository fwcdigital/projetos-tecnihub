import React, { useState } from 'react';
import { Client, Project, ProjectStatusDefinition, Task, User } from '../types';
import { TaskRow } from '../components/TaskRow';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
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
import { AlertTriangle, Loader2, Pencil, Power, PowerOff, Trash2, X } from 'lucide-react';
import { PriorityPicker } from '../components/PriorityPicker';
import { StatusPicker } from '../components/StatusPicker';
import { getWorkflowStatusOptions } from '../components/visualTokens';
import { canManageProjectOperations, isAdministrator } from '../permissions';

interface ClientDetailViewProps {
  client: Client;
  currentUser: User;
  projectStatuses: ProjectStatusDefinition[];
  projects: Project[];
  tasks: Task[];
  completedTasks: Task[];
  onBack: () => void;
  onSelectProject: (project: Project) => void;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onUpdateTask: (task: Task) => void;
  onOpenNewTask: () => void;
  onOpenNewProject?: () => void;
  onUpdateProject: (project: Project, updates: Partial<Project>, teamUserIds?: string[]) => Promise<void>;
  onEditClient?: () => void;
  onSetClientStatus?: (status: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  onDeleteClient?: (confirmationName: string) => Promise<void>;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  currentUser,
  projectStatuses,
  projects,
  tasks,
  completedTasks,
  onBack,
  onSelectProject,
  onSelectTask,
  onToggleComplete,
  onUpdateTask,
  onOpenNewTask,
  onOpenNewProject,
  onUpdateProject,
  onEditClient,
  onSetClientStatus,
  onDeleteClient
}) => {
  const canManageProjects = canManageProjectOperations(currentUser.role);
  const canManageClient = isAdministrator(currentUser.role);
  const [confirmation, setConfirmation] = useState<'INACTIVATE' | 'DELETE' | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const inactive = client.accountStatus === 'INACTIVE';
  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientTasks = tasks.filter(t => t.clientId === client.id);
  const clientCompletedTasks = completedTasks.filter(t => t.clientId === client.id);
  const totalTaskCount = clientTasks.length + clientCompletedTasks.length;

  const reactivateClient = async () => {
    if (!onSetClientStatus) return;
    setActionBusy(true);
    setActionError('');
    try {
      await onSetClientStatus('ACTIVE');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível reativar o cliente.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 p-4 animate-in fade-in duration-150 sm:p-6">
      {/* Back button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para Lista de Clientes</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {canManageClient && onEditClient && <button type="button" onClick={onEditClient} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700"><Pencil size={13} />Editar cliente</button>}
          {canManageClient && onSetClientStatus && (inactive
            ? <button type="button" disabled={actionBusy} onClick={() => void reactivateClient()} className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-950/60 disabled:opacity-50">{actionBusy ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}Reativar cliente</button>
            : <button type="button" onClick={() => { setActionError(''); setConfirmation('INACTIVATE'); }} className="flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-950/50"><PowerOff size={13} />Inativar cliente</button>)}
          {canManageClient && onDeleteClient && <button type="button" onClick={() => { setActionError(''); setDeleteConfirmationName(''); setConfirmation('DELETE'); }} className="flex items-center gap-1.5 rounded-lg border border-rose-800/60 bg-rose-950/25 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-950/50"><Trash2 size={13} />Excluir definitivamente</button>}
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
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${inactive ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
                  {inactive ? 'Cliente Inativo' : 'Cliente Ativo'}
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
              <span className="block text-lg font-black text-white font-mono">{clientCompletedTasks.length}/{totalTaskCount}</span>
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

      {!confirmation && actionError && <div role="alert" className="rounded-lg border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">{actionError}</div>}

      {confirmation && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => !actionBusy && setConfirmation(null)} />
          <div role="alertdialog" aria-modal="true" aria-labelledby="client-confirmation-title" className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-[#15151a] shadow-2xl shadow-black/70">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
              <div className="flex gap-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${confirmation === 'DELETE' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}><AlertTriangle size={16} /></span><div><h2 id="client-confirmation-title" className="text-sm font-bold text-zinc-100">{confirmation === 'DELETE' ? 'Excluir cliente definitivamente' : 'Inativar cliente'}</h2><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{confirmation === 'DELETE' ? 'Esta ação excluirá definitivamente o cliente e todos os dados relacionados, incluindo projetos, tarefas e histórico operacional. Esta ação não pode ser desfeita.' : 'O cliente deixará a listagem de ativos, mas seus projetos, tarefas e histórico serão preservados.'}</p></div></div>
              <button type="button" disabled={actionBusy} onClick={() => setConfirmation(null)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X size={16} /></button>
            </div>
            {confirmation === 'DELETE' && <div className="mx-4 mt-4 space-y-3 rounded-lg border border-rose-900/60 bg-rose-950/25 p-3 text-[11px] leading-relaxed text-rose-200"><p>Um snapshot técnico será preservado somente para auditoria. O cliente e seus vínculos não permanecerão nas telas ou consultas operacionais.</p><label className="block"><span className="mb-1 block font-semibold text-rose-100">Digite <strong>{client.name}</strong> para confirmar</span><input autoFocus value={deleteConfirmationName} onChange={event => setDeleteConfirmationName(event.target.value)} className="w-full rounded-lg border border-rose-900/80 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-rose-600" placeholder={client.name} /></label></div>}
            {actionError && <div className="mx-4 mt-4 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-200">{actionError}</div>}
            <div className="flex justify-end gap-2 p-4">
              <button type="button" disabled={actionBusy} onClick={() => setConfirmation(null)} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={actionBusy || (confirmation === 'DELETE' && deleteConfirmationName.trim() !== client.name)} onClick={() => {
                setActionBusy(true);
                setActionError('');
                const action = confirmation === 'DELETE' ? onDeleteClient?.(deleteConfirmationName.trim()) : onSetClientStatus?.('INACTIVE');
                Promise.resolve(action).then(() => { setConfirmation(null); setDeleteConfirmationName(''); }).catch(error => setActionError(error instanceof Error ? error.message : 'Não foi possível concluir a ação.')).finally(() => setActionBusy(false));
              }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${confirmation === 'DELETE' ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'}`}>{actionBusy && <Loader2 size={13} className="animate-spin" />}{confirmation === 'DELETE' ? 'Sim, excluir definitivamente' : 'Sim, inativar cliente'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Projects of this Client */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <FolderKanban size={16} className="text-sky-400" />
            Projetos Ativos deste Cliente ({clientProjects.length})
          </h2>
          {onOpenNewProject && <button onClick={onOpenNewProject} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-bold"><Plus size={13} />Novo projeto</button>}
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
                <div className="flex items-center gap-1.5"><PriorityPicker value={p.priority} onChange={canManageProjects ? priority => void onUpdateProject(p, { priority }) : undefined} /><StatusPicker value={p.status} options={getWorkflowStatusOptions(p.workflowStatuses || [], { value: p.status, label: p.statusName, color: p.statusColor })} onChange={canManageProjects ? status => void onUpdateProject(p, { status }) : undefined} ariaLabel={`Alterar status de ${p.name}`} /></div>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-1">{p.description}</p>
              <div className="flex items-center justify-end text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
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
            Fila de Tarefas ({clientTasks.length})
          </h2>
        </div>

        <div className="space-y-2">
          {clientTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onSelectTask={onSelectTask}
                    onToggleComplete={onToggleComplete}
              onUpdateTask={onUpdateTask}
              projects={projects}
            />
          ))}
          <CompletedTasksSection
            tasks={clientCompletedTasks}
            onSelectTask={onSelectTask}
            onToggleComplete={onToggleComplete}
            onUpdateTask={onUpdateTask}
            projects={projects}
            contextKey={client.id}
          />
        </div>
      </div>
    </div>
  );
};
