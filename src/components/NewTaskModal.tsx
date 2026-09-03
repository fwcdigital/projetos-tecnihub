import React, { useEffect, useMemo, useState } from 'react';
import { Client, Priority, Project, RecurrenceFrequency, Task, TaskStatus, User } from '../types';
import { AlertCircle, Calendar, Clock, FolderKanban, Loader2, UserCheck, X } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { AssigneePicker } from './AssigneePicker';
import { DateTimePicker } from './DateTimePicker';
import { canManageTaskAssignments } from '../permissions';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';
import { TASK_STATUS_OPTIONS } from './visualTokens';

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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([currentUser.id]);
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [status, setStatus] = useState<TaskStatus>('A_FAZER');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('18:00');
  const [description, setDescription] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('NAO_REPETIR');
  const [customRecurrence, setCustomRecurrence] = useState('');
  const [customIntervalDays, setCustomIntervalDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canAssignPeople = canManageTaskAssignments(currentUser.role);

  useEffect(() => {
    if (isOpen) {
      setProjectId(firstProject?.id || '');
      setAssigneeIds([currentUser.id]);
      setError(null);
    }
  }, [currentUser.id, firstProject?.id, isOpen]);

  const selectedProject = projects.find(project => project.id === projectId) || firstProject;
  const selectedClient = clients.find(client => client.id === selectedProject?.clientId);
  const projectMemberIds = new Set(selectedProject?.teamMemberDetails?.map(member => member.id) || []);
  const candidateUsers = [...users]
    .filter(user => user.accountStatus !== 'INACTIVE' && projectMemberIds.has(user.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const preferredAssigneeId = canAssignPeople ? (selectedProject?.teamMemberDetails?.[0]?.id || currentUser.id) : currentUser.id;

  useEffect(() => {
    setAssigneeIds([preferredAssigneeId]);
  }, [preferredAssigneeId, projectId]);

  useEffect(() => {
    if (!selectedProject) return;
    const preferred = candidateUsers.find(user => projectMemberIds.has(user.id)) || currentUser;
    const validIds = assigneeIds.filter(id => candidateUsers.some(user => user.id === id));
    if (validIds.length !== assigneeIds.length || validIds.length === 0) setAssigneeIds(validIds.length ? validIds : [preferred.id]);
  }, [assigneeIds, candidateUsers, currentUser, projectId, projectMemberIds, selectedProject]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !selectedProject || !dueDate || assigneeIds.length === 0) {
      setError('Preencha título, projeto, responsável e prazo.');
      return;
    }
    const assignee = users.find(user => user.id === assigneeIds[0]) || currentUser;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddTask({
        id: '', title: title.trim(), description, clientId: selectedProject.clientId,
        clientName: selectedClient?.name || selectedProject.clientName, projectId: selectedProject.id,
        projectName: selectedProject.name, assigneeId: assignee.id, assigneeName: assignee.name,
        assigneeAvatar: assignee.avatar, participantIds: assigneeIds, priority, status,
        startDate, startTime, dueDate, dueTime, isRecurring: false, subtasks: [], checklist: [], comments: [],
        attachments: [], history: [], createdBy: currentUser.name, createdAt: '',
        recurrence: recurrenceFrequency === 'NAO_REPETIR' ? undefined : ({
          frequency: recurrenceFrequency,
          ruleText: customRecurrence || ({ DIARIO: 'Todos os dias', SEMANAL: 'Toda semana', QUINZENAL: 'A cada 15 dias', MENSAL: 'Todo mês', PERSONALIZADO: `A cada ${customIntervalDays} dias` } as any)[recurrenceFrequency],
          customIntervalDays: recurrenceFrequency === 'PERSONALIZADO' ? customIntervalDays : undefined
        } as any)
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
          <div className="rounded-xl border border-zinc-800 bg-[#181820] p-3"><AssigneePicker users={candidateUsers} selectedIds={assigneeIds} onChange={setAssigneeIds} disabled={!canAssignPeople} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-[11px] font-semibold text-zinc-400 mb-1">Status</label><StatusPicker value={status} options={TASK_STATUS_OPTIONS} onChange={value => setStatus(value as TaskStatus)} ariaLabel="Status inicial da tarefa" /></div><div><label className="block text-[11px] font-semibold text-zinc-400 mb-1">Prioridade</label><PriorityPicker value={priority} onChange={setPriority} /></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><DateTimePicker label="Data inicial" value={startDate} time={startTime} allowClear onChange={(date, time) => { setStartDate(date); setStartTime(date ? (time || '') : ''); if (date && dueDate < date) setDueDate(date); }} /><DateTimePicker label="Prazo" value={dueDate} time={dueTime} onChange={(date, time) => { setDueDate(startDate && date < startDate ? startDate : date); setDueTime(time || ''); }} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-[#181820] p-3"><label className="text-[11px] font-semibold text-zinc-400">Recorrência<select value={recurrenceFrequency} onChange={event => setRecurrenceFrequency(event.target.value as RecurrenceFrequency)} className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-200"><option value="NAO_REPETIR">Não repetir</option><option value="DIARIO">Diariamente</option><option value="SEMANAL">Semanalmente</option><option value="QUINZENAL">Quinzenalmente</option><option value="MENSAL">Mensalmente</option><option value="PERSONALIZADO">Personalizado</option></select></label>{recurrenceFrequency === 'PERSONALIZADO' && <div className="grid grid-cols-[90px_1fr] gap-2"><label className="text-[11px] font-semibold text-zinc-400">Intervalo<input type="number" min="1" value={customIntervalDays} onChange={event => setCustomIntervalDays(Math.max(1, Number(event.target.value)))} className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-200 outline-none" /></label><label className="text-[11px] font-semibold text-zinc-400">Regra personalizada<input value={customRecurrence} onChange={event => setCustomRecurrence(event.target.value)} placeholder={`A cada ${customIntervalDays} dias`} className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-200 outline-none" /></label></div>}</div>
          <div><label className="block text-[11px] font-semibold text-zinc-400 mb-1">Descrição</label><textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 resize-none" /></div>
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300">Cancelar</button><button disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-bold disabled:opacity-50">{isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Tarefa'}</button></div>
        </form>
      </div>
    </div>
  );
};
