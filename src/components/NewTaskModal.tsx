import React, { useEffect, useMemo, useState } from 'react';
import { Client, Priority, Project, Task, TaskStatus, User } from '../types';
import { AlertCircle, Calendar, Clock, FolderKanban, Loader2, UserCheck, X } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (newTask: Task) => Promise<void> | void;
  clients: Client[];
  projects: Project[];
  users: User[];
  currentUser: User;
  defaultProjectId?: string;
  defaultClientId?: string;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen, onClose, onAddTask, clients, projects, users, currentUser, defaultProjectId, defaultClientId
}) => {
  const firstProject = useMemo(() => {
    if (defaultProjectId) return projects.find(project => project.id === defaultProjectId);
    if (defaultClientId) return projects.find(project => project.clientId === defaultClientId);
    return projects[0];
  }, [defaultClientId, defaultProjectId, projects]);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(firstProject?.id || '');
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [status, setStatus] = useState<TaskStatus>('A_FAZER');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('18:00');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProjectId(firstProject?.id || '');
      setAssigneeId(currentUser.id);
      setError(null);
    }
  }, [currentUser.id, firstProject?.id, isOpen]);

  const selectedProject = projects.find(project => project.id === projectId) || firstProject;
  const selectedClient = clients.find(client => client.id === selectedProject?.clientId);
  const projectMemberIds = new Set(selectedProject?.teamMemberDetails?.map(member => member.id) || []);
  const isAdmin = currentUser.role === 'ADMIN_PRINCIPAL' || currentUser.role === 'ADMIN';
  const candidateUsers = [...users]
    .filter(user => user.accountStatus !== 'INACTIVE' && (isAdmin || projectMemberIds.has(user.id)))
    .sort((a, b) => Number(projectMemberIds.has(b.id)) - Number(projectMemberIds.has(a.id)));
  const preferredAssigneeId = selectedProject?.teamMemberDetails?.[0]?.id || currentUser.id;

  useEffect(() => {
    setAssigneeId(preferredAssigneeId);
  }, [preferredAssigneeId, projectId]);

  useEffect(() => {
    if (!selectedProject) return;
    const preferred = candidateUsers.find(user => projectMemberIds.has(user.id)) || currentUser;
    if (!candidateUsers.some(user => user.id === assigneeId)) setAssigneeId(preferred.id);
  }, [assigneeId, candidateUsers, currentUser, projectId, projectMemberIds, selectedProject]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !selectedProject || !dueDate || !assigneeId) {
      setError('Preencha título, projeto, responsável e prazo.');
      return;
    }
    const assignee = users.find(user => user.id === assigneeId) || currentUser;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddTask({
        id: '', title: title.trim(), description, clientId: selectedProject.clientId,
        clientName: selectedClient?.name || selectedProject.clientName, projectId: selectedProject.id,
        projectName: selectedProject.name, assigneeId: assignee.id, assigneeName: assignee.name,
        assigneeAvatar: assignee.avatar, participantIds: [assignee.id], priority, status,
        startDate, dueDate, dueTime, isRecurring: false, subtasks: [], checklist: [], comments: [],
        attachments: [], history: [], createdBy: currentUser.name, createdAt: ''
      });
      setTitle('');
      setDescription('');
      onClose();
    } catch (submissionError: any) {
      setError(submissionError.message || 'Não foi possível salvar a tarefa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />Criar Nova Tarefa / Demanda</h2>
            <p className="text-[11px] text-zinc-400">A tarefa será salva no projeto selecionado</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"><X size={18} /></button>
        </div>
        {error && <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div><label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Nome da Tarefa *</label><input autoFocus value={title} onChange={event => setTitle(event.target.value)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500" /></div>
          {defaultProjectId ? (
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center gap-3"><FolderKanban size={16} className="text-emerald-400" /><div><span className="text-[10px] uppercase font-bold text-zinc-500 block">Projeto preenchido automaticamente</span><span className="font-semibold text-white">{selectedProject?.name}</span><span className="text-zinc-500"> · {selectedClient?.name}</span></div></div>
          ) : (
            <div><label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1"><FolderKanban size={12} />Projeto *</label><select value={projectId} onChange={event => setProjectId(event.target.value)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200">{projects.map(project => <option key={project.id} value={project.id}>{project.name} ({project.clientName})</option>)}</select></div>
          )}
          <div><label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1"><UserCheck size={12} />Responsável</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">{candidateUsers.map(user => <button type="button" key={user.id} onClick={() => setAssigneeId(user.id)} className={`flex items-center gap-2 p-2 rounded-xl border text-left ${assigneeId === user.id ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-[#181820] border-zinc-700'}`}><UserAvatar name={user.name} src={user.avatar} className="w-6 h-6" /><span className="min-w-0"><span className="block text-zinc-200 truncate">{user.name}</span><span className="block text-[9px] text-zinc-500 truncate">{projectMemberIds.has(user.id) ? 'Equipe do projeto · ' : ''}{user.position}</span></span></button>)}</div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-zinc-400 mb-1">Status</label><select value={status} onChange={event => setStatus(event.target.value as TaskStatus)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200"><option value="BACKLOG">Backlog</option><option value="A_FAZER">A fazer</option><option value="EM_ANDAMENTO">Em andamento</option><option value="AGUARDANDO_CLIENTE">Aguardando cliente</option><option value="EM_REVISAO">Em revisão</option><option value="BLOQUEADO">Bloqueado</option><option value="CONCLUIDO">Concluído</option></select></div><div><label className="block text-[11px] font-semibold text-zinc-400 mb-1">Prioridade</label><select value={priority} onChange={event => setPriority(event.target.value as Priority)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200"><option value="URGENTE">Urgente</option><option value="ALTA">Alta</option><option value="NORMAL">Normal</option><option value="BAIXA">Baixa</option></select></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label className="text-zinc-400"><Calendar size={12} className="inline mr-1" />Início<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="block mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label><label className="text-zinc-400"><Calendar size={12} className="inline mr-1" />Prazo *<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="block mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label><label className="text-zinc-400"><Clock size={12} className="inline mr-1" />Horário<input type="time" value={dueTime} onChange={event => setDueTime(event.target.value)} className="block mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label></div>
          <div><label className="block text-[11px] font-semibold text-zinc-400 mb-1">Descrição</label><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 resize-none" /></div>
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300">Cancelar</button><button disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-bold disabled:opacity-50">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Tarefa'}</button></div>
        </form>
      </div>
    </div>
  );
};
