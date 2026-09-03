import React, { useState } from 'react';
import { Task, TaskStatus, Priority, Subtask, User, RecurrenceFrequency, Project } from '../types';
import { 
  X, 
  Check, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Paperclip, 
  History, 
  Calendar, 
  Clock, 
  Repeat, 
  User as UserIcon, 
  Users, 
  Building2, 
  FolderKanban, 
  Share2, 
  Copy, 
  CheckSquare, 
  Send,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { AssigneePicker } from './AssigneePicker';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';
import { TASK_STATUS_OPTIONS } from './visualTokens';
import { DateTimePicker } from './DateTimePicker';
import { taskService } from '../services/taskService';
import { InlineEditableField } from './InlineEditableField';
import { TaskChecklist } from './TaskChecklist';
import { canManageTaskAssignments } from '../permissions';

interface TaskDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updated: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  currentUser: User;
  users?: User[];
  projects?: Project[];
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  currentUser,
  users,
  projects
}) => {
  if (!isOpen || !task) return null;

  const project = projects?.find(item => item.id === task.projectId);
  const projectMemberIds = new Set(project?.teamMemberDetails?.map(member => member.id) || []);
  const availableUsers = task.availableAssignees?.length
    ? task.availableAssignees
    : (users || []).filter(user => user.accountStatus !== 'INACTIVE' && projectMemberIds.has(user.id));
  const canAssignPeople = canManageTaskAssignments(currentUser.role);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'SUBTASKS' | 'CHECKLIST' | 'COMMENTS' | 'FILES' | 'HISTORY'>('DETAILS');
  
  // Subtask Form State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSubtaskRecurring, setIsSubtaskRecurring] = useState(false);
  const [subtaskFrequency, setSubtaskFrequency] = useState<RecurrenceFrequency>('SEMANAL');
  const [subtaskRule, setSubtaskRule] = useState('Toda semana');
  const [subtaskAssigneeName, setSubtaskAssigneeName] = useState(task.assigneeName || 'Caio Rocha');
  const [subtaskDueDate, setSubtaskDueDate] = useState(task.dueDate);
  const [subtaskDueTime, setSubtaskDueTime] = useState(task.dueTime || '10:00');
  const [showSubtaskFormOptions, setShowSubtaskFormOptions] = useState(false);
  const [subtaskTabFilter, setSubtaskTabFilter] = useState<'ALL' | 'RECURRING_ONLY'>('ALL');

  const [newCommentText, setNewCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionError, setActionError] = useState('');

  const isCompleted = task.status === 'CONCLUIDO';
  const recurringSubtasksCount = task.subtasks.filter(s => s.isRecurring).length;

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      setActionError('');
      const subtask = task.subtasks.find(item => item.id === subtaskId);
      if (!subtask) return;
      const updated = await taskService.update(subtask.id, { status: subtask.completed || subtask.status === 'CONCLUIDO' ? 'A_FAZER' : 'CONCLUIDO' });
      onUpdateTask({ ...task, subtasks: task.subtasks.map(item => item.id === updated.id ? updated as unknown as Subtask : item) });
    } catch (error: any) { setActionError(error.message || 'Não foi possível atualizar a subtarefa.'); }
  };

  // Delete Subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      setActionError('');
      await taskService.delete(subtaskId);
      onUpdateTask({ ...task, subtasks: task.subtasks.filter(sub => sub.id !== subtaskId) });
    } catch (error: any) { setActionError(error.message || 'Não foi possível excluir a subtarefa.'); }
  };

  // Toggle Subtask Recurrence
  const handleToggleSubtaskRecurrence = async (subtaskId: string) => {
    try {
      setActionError('');
      const subtask = task.subtasks.find(item => item.id === subtaskId);
      if (!subtask) return;
      const updated = subtask.isRecurring
        ? await taskService.removeRecurrence(subtaskId)
        : await taskService.setRecurrence(subtaskId, { frequency: 'SEMANAL', ruleText: 'Toda semana' });
      onUpdateTask({ ...task, subtasks: task.subtasks.map(item => item.id === subtaskId ? updated as unknown as Subtask : item) });
    } catch (error: any) { setActionError(error.message || 'Não foi possível alterar a recorrência.'); }
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const selectedUser = canAssignPeople
      ? (availableUsers.find(user => user.name === subtaskAssigneeName) || availableUsers[0])
      : availableUsers.find(user => user.id === currentUser.id);
    try {
      setActionError('');
      const newSub = await taskService.createSubtask(task, {
        title: newSubtaskTitle.trim(), participantIds: selectedUser ? [selectedUser.id] : [currentUser.id],
        assigneeId: selectedUser?.id || currentUser.id, dueDate: subtaskDueDate, dueTime: subtaskDueTime,
        status: 'A_FAZER', priority: 'NORMAL', description: ''
      });
      if (isSubtaskRecurring) {
        const recurringSubtask = await taskService.setRecurrence(newSub.id, { frequency: subtaskFrequency, ruleText: subtaskRule });
        onUpdateTask({ ...task, subtasks: [...task.subtasks, recurringSubtask as unknown as Subtask] });
      } else {
        onUpdateTask({ ...task, subtasks: [...task.subtasks, newSub as unknown as Subtask] });
      }
      setNewSubtaskTitle('');
      setIsSubtaskRecurring(false);
      setShowSubtaskFormOptions(false);
    } catch (error: any) { setActionError(error.message || 'Não foi possível criar a subtarefa.'); }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      setActionError('');
      const updated = await taskService.addComment(task.id, newCommentText.trim());
      onUpdateTask(updated);
      setNewCommentText('');
    } catch (error: any) { setActionError(error.message || 'Não foi possível adicionar o comentário.'); }
  };

  // Change Status
  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdateTask({
      ...task,
      status: newStatus
    });
  };

  // Change Priority
  const handlePriorityChange = (newPriority: Priority) => {
    onUpdateTask({
      ...task,
      priority: newPriority
    });
  };

  const copyTaskRef = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch { setActionError('Não foi possível copiar o link da tarefa.'); }
  };

  // Filtered subtasks
  const displayedSubtasks = task.subtasks.filter(sub => {
    if (subtaskTabFilter === 'RECURRING_ONLY') return sub.isRecurring;
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity" 
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full sm:max-w-xl md:max-w-2xl w-full bg-[#111115] border-l border-[#22222a] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#22222a] bg-[#141419]">
          <div className="flex items-center gap-2 text-xs text-zinc-400 overflow-hidden">
            <span className="flex items-center gap-1 font-medium text-zinc-300 truncate max-w-[100px] sm:max-w-[140px]">
              <Building2 size={13} className="text-zinc-500 flex-shrink-0" />
              <span className="truncate">{task.clientName}</span>
            </span>
            <span>/</span>
            <span className="flex items-center gap-1 text-zinc-400 truncate max-w-[100px] sm:max-w-[140px]">
              <FolderKanban size={13} className="text-zinc-500 flex-shrink-0" />
              <span className="truncate">{task.projectName}</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono flex-shrink-0">
              #{task.id}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => { if (window.confirm(`Excluir a tarefa "${task.title}"?`)) void onDeleteTask(task.id); }} className="p-2 sm:p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10" title="Excluir tarefa"><Trash2 size={14} /></button>
            <button
              onClick={copyTaskRef}
              className="p-2 sm:p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1 min-h-[38px] sm:min-h-0"
              title="Copiar link da tarefa"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="text-[11px] hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 sm:p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Fechar detalhes"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6">
          {actionError && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{actionError}</div>}
          {/* Main Title & Complete Toggle */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleStatusChange(isCompleted ? 'A_FAZER' : 'CONCLUIDO')}
              className={`w-7 h-7 sm:w-6 sm:h-6 rounded-md flex-shrink-0 flex items-center justify-center border transition-colors mt-0.5 ${
                isCompleted 
                  ? 'bg-emerald-500 border-emerald-500 text-black' 
                  : 'border-zinc-600 hover:border-emerald-400 bg-zinc-900 active:bg-zinc-800'
              }`}
            >
              {isCompleted && <Check size={16} strokeWidth={3} />}
            </button>

            <div className="flex-1">
              <InlineEditableField value={task.title} onSave={title => onUpdateTask({ ...task, title })} className={`w-full bg-transparent pb-1 text-left text-base font-bold text-zinc-100 sm:text-xl ${isCompleted ? 'line-through text-zinc-500' : ''}`} />
            </div>
          </div>

          {/* Quick Metadata Grid (Properties Table) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#16161c] border border-zinc-800 text-xs">
            {/* Status Selector */}
            <div className="flex items-center justify-between p-1.5">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                Status
              </span>
              <StatusPicker value={task.status} options={TASK_STATUS_OPTIONS} onChange={status => handleStatusChange(status as TaskStatus)} ariaLabel="Alterar status da tarefa" />
            </div>

            {/* Priority Selector */}
            <div className="flex items-center justify-between p-1.5">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                <AlertCircle size={13} className="text-zinc-500" />
                Prioridade
              </span>
              <PriorityPicker value={task.priority} onChange={handlePriorityChange} />
            </div>

            <div className="p-1.5">
              <AssigneePicker
                users={availableUsers}
                selectedIds={task.participantIds}
                selectedAssignees={task.assignees}
                onChange={participantIds => onUpdateTask({ ...task, participantIds })}
                disabled={!canAssignPeople}
              />
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-1 gap-2 p-1.5 sm:grid-cols-2"><DateTimePicker label="Data inicial" value={task.startDate || ''} time={task.startTime} allowClear onChange={(startDate, startTime) => onUpdateTask({ ...task, startDate: startDate || null, startTime: startDate ? (startTime || null) : null, dueDate: startDate && task.dueDate < startDate ? startDate : task.dueDate })} /><DateTimePicker label="Prazo final" value={task.dueDate} time={task.dueTime} onChange={(dueDate, dueTime) => onUpdateTask({ ...task, dueDate: task.startDate && dueDate < task.startDate ? task.startDate : dueDate, dueTime: dueTime || null })} /></div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-800/80 p-1.5 pt-3 sm:col-span-2">
              <span className="flex items-center gap-1.5 font-medium text-zinc-400"><Repeat size={13} className={task.isRecurring ? 'text-emerald-400' : 'text-zinc-500'} />Recorrência</span>
              <select
                value={task.recurrence?.frequency || 'NAO_REPETIR'}
                onChange={async event => {
                  const frequency = event.target.value as RecurrenceFrequency;
                  if (frequency === 'NAO_REPETIR') onUpdateTask(await taskService.removeRecurrence(task.id));
                  else {
                    const labels: Record<string, string> = { DIARIO: 'Todos os dias', SEMANAL: 'Toda semana', QUINZENAL: 'A cada 15 dias', MENSAL: 'Todo mês', PERSONALIZADO: 'A cada 7 dias' };
                    onUpdateTask(await taskService.setRecurrence(task.id, { frequency, ruleText: labels[frequency], customIntervalDays: frequency === 'PERSONALIZADO' ? 7 : undefined }));
                  }
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500"
              >
                <option value="NAO_REPETIR">Não repetir</option><option value="DIARIO">Diariamente</option><option value="SEMANAL">Semanalmente</option><option value="QUINZENAL">Quinzenalmente</option><option value="MENSAL">Mensalmente</option><option value="PERSONALIZADO">Personalizado</option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-1 overflow-x-auto text-xs whitespace-nowrap no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('SUBTASKS')}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 min-h-[38px] sm:min-h-0 ${
                activeTab === 'SUBTASKS' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Repeat size={13} className={recurringSubtasksCount > 0 ? 'text-emerald-400' : ''} />
              Subtarefas
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px]">
                {task.subtasks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 min-h-[38px] sm:min-h-0 ${
                activeTab === 'DETAILS' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Descrição & Contexto
            </button>
            <button
              onClick={() => setActiveTab('CHECKLIST')}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 min-h-[38px] sm:min-h-0 ${
                activeTab === 'CHECKLIST' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Checklist Geral
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px]">
                {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('COMMENTS')}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 min-h-[38px] sm:min-h-0 ${
                activeTab === 'COMMENTS' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Comentários
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px]">
                {task.comments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('FILES')}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 min-h-[38px] sm:min-h-0 ${
                activeTab === 'FILES' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Arquivos
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px]">
                {task.attachments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 min-h-[38px] sm:min-h-0 ${
                activeTab === 'HISTORY' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Histórico
            </button>
          </div>

          {/* TAB 1: SUBTASKS (Now First & Primary with Recurrence Engine) */}
          {activeTab === 'SUBTASKS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-800/80">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <span>Subtarefas Operacionais & Rotinas</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Crie subtarefas e marque quais possuem ciclo recorrente (diário, semanal, quinzenal ou mensal).
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs self-start sm:self-auto">
                  <button
                    onClick={() => setSubtaskTabFilter('ALL')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      subtaskTabFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Todas ({task.subtasks.length})
                  </button>
                  <button
                    onClick={() => setSubtaskTabFilter('RECURRING_ONLY')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      subtaskTabFilter === 'RECURRING_ONLY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Repeat size={11} />
                    Recorrentes ({recurringSubtasksCount})
                  </button>
                </div>
              </div>

              {/* Add New Subtask Form */}
              <form onSubmit={handleAddSubtask} className="p-3.5 rounded-xl bg-[#15151c] border border-zinc-800 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="+ Digite o nome da subtarefa ou rotina..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 bg-[#1a1a24] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSubtaskFormOptions(!showSubtaskFormOptions)}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isSubtaskRecurring || showSubtaskFormOptions 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Opções de recorrência e responsável"
                  >
                    <Repeat size={13} />
                    <span className="hidden sm:inline">Recorrência</span>
                    {showSubtaskFormOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors shadow-xs"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Expanded Recurrence & Assignee Configuration Panel */}
                {showSubtaskFormOptions && (
                  <div className="pt-2 border-t border-zinc-800 space-y-3 animate-in fade-in-50 duration-150 text-xs">
                    {/* Toggle Recurrence */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSubtaskRecurring}
                          onChange={(e) => setIsSubtaskRecurring(e.target.checked)}
                          className="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-800 border-zinc-700"
                        />
                        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Repeat size={13} className="text-emerald-400" />
                          Tornar esta subtarefa uma Rotina Recorrente
                        </span>
                      </label>

                      {isSubtaskRecurring && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={subtaskFrequency}
                            onChange={(e) => {
                              const freq = e.target.value as RecurrenceFrequency;
                              setSubtaskFrequency(freq);
                              if (freq === 'DIARIO') setSubtaskRule('Diariamente às 09:00');
                              if (freq === 'SEMANAL') setSubtaskRule('Toda segunda-feira');
                              if (freq === 'QUINZENAL') setSubtaskRule('A cada 15 dias');
                              if (freq === 'MENSAL') setSubtaskRule('Todo dia 01 do mês');
                            }}
                            className="bg-[#121216] border border-zinc-700 rounded-md px-2 py-1 text-zinc-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                          >
                            <option value="DIARIO">Diário</option>
                            <option value="SEMANAL">Semanal</option>
                            <option value="QUINZENAL">Quinzenal</option>
                            <option value="MENSAL">Mensal</option>
                            <option value="PERSONALIZADO">Personalizado</option>
                          </select>

                          <input
                            type="text"
                            placeholder="Regra (ex: Toda terça)"
                            value={subtaskRule}
                            onChange={(e) => setSubtaskRule(e.target.value)}
                            className="bg-[#121216] border border-zinc-700 rounded-md px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 max-w-[160px]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Assignee & Dates Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-semibold mb-1">
                          Responsável da Subtarefa
                        </label>
                        <select
                          value={canAssignPeople ? subtaskAssigneeName : currentUser.name}
                          onChange={(e) => setSubtaskAssigneeName(e.target.value)}
                          disabled={!canAssignPeople}
                          className="w-full bg-[#121216] border border-zinc-700 rounded-md p-1.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {canAssignPeople
                            ? availableUsers.map(u => (
                                <option key={u.id} value={u.name}>{u.name} ({u.position})</option>
                              ))
                            : <option value={currentUser.name}>{currentUser.name}</option>}
                        </select>
                      </div>

                      <div className="sm:col-span-2"><DateTimePicker label="Prazo da subtarefa" value={subtaskDueDate} time={subtaskDueTime} onChange={(date, time) => { setSubtaskDueDate(date); setSubtaskDueTime(time || ''); }} /></div>
                    </div>
                  </div>
                )}
              </form>

              {/* Subtasks List */}
              <div className="space-y-2">
                {displayedSubtasks.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800 text-zinc-500 text-xs">
                    {subtaskTabFilter === 'RECURRING_ONLY' 
                      ? 'Nenhuma rotina recorrente configurada nesta tarefa ainda.' 
                      : 'Nenhuma subtarefa cadastrada. Adicione acima.'}
                  </div>
                ) : (
                  displayedSubtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-3 rounded-xl border transition-all ${
                        sub.isRecurring 
                          ? 'bg-[#15171e] border-emerald-500/20 hover:border-emerald-500/40' 
                          : 'bg-[#16161c] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleSubtask(sub.id)}
                            className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                              sub.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-600 bg-zinc-900 hover:border-emerald-400'
                            }`}
                          >
                            {sub.completed && <Check size={11} strokeWidth={3} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* Title & Recurring Badge */}
                            <div>
                              <p className={`text-xs font-semibold leading-snug break-words text-zinc-100 ${sub.completed ? 'line-through text-zinc-500' : ''}`}>
                                {sub.title}
                              </p>

                              {sub.isRecurring && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                                    <Repeat size={10} className="flex-shrink-0" />
                                    <span>{sub.recurrenceFrequency}: {sub.recurrenceRule || 'Recorrente'}</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Metadata row: Assignee, Due date */}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-400 flex-wrap">
                              {sub.assigneeName && (
                                <span className="flex items-center gap-1 text-zinc-300">
                                  <UserIcon size={11} className="text-zinc-500" />
                                  {sub.assigneeName}
                                </span>
                              )}

                              {sub.dueDate && (
                                <span className="flex items-center gap-1 font-mono text-zinc-400">
                                  <Calendar size={11} className="text-zinc-500" />
                                  {sub.dueDate.split('-').reverse().join('/')}
                                  {sub.dueTime && <span> às {sub.dueTime}</span>}
                                </span>
                              )}
                            </div>

                            {/* Subtask Checklists (if any) */}
                            {sub.checklist && sub.checklist.length > 0 && (
                              <div className="mt-2 pl-2 border-l border-zinc-800 space-y-1">
                                {sub.checklist.map((c) => (
                                  <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                    <span className={c.completed ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                                      {c.completed ? '☑' : '☐'}
                                    </span>
                                    <span className={c.completed ? 'line-through text-zinc-500' : ''}>{c.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Toggle recurrence button */}
                          <button
                            onClick={() => void handleToggleSubtaskRecurrence(sub.id)}
                            className={`p-1 rounded-md text-xs transition-colors ${
                              sub.isRecurring 
                                ? 'text-emerald-400 hover:bg-emerald-500/10' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                            title={sub.isRecurring ? 'Desativar recorrência desta subtarefa' : 'Tornar subtarefa recorrente'}
                          >
                            <Repeat size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            title="Excluir subtarefa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DETAILS */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Descrição da Demanda
                </label>
                <textarea
                  value={task.description}
                  onChange={(e) => onUpdateTask({ ...task, description: e.target.value })}
                  rows={4}
                  className="w-full bg-[#15151b] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-zinc-600 resize-none"
                  placeholder="Detalhes, escopo e instruções para execução..."
                />
              </div>

              {/* Quick Summary of Checklist & Subtasks */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-emerald-400" />
                    Progresso das Subtarefas
                  </span>
                  <span>
                    {task.subtasks.length > 0
                      ? `${Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: task.subtasks.length > 0 
                        ? `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` 
                        : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Meta information */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
                <span>Criado por: <strong className="text-zinc-400">{task.createdBy}</strong></span>
                <span>Data de Criação: {task.createdAt}</span>
              </div>
            </div>
          )}

          {/* TAB 3: CHECKLIST */}
          {activeTab === 'CHECKLIST' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Itens de Verificação / Checklist</span>
              <TaskChecklist ownerId={task.id} items={task.checklist} users={availableUsers} onOwnerUpdate={onUpdateTask} />
            </div>
          )}

          {/* TAB 4: COMMENTS */}
          {activeTab === 'COMMENTS' && (
            <div className="space-y-4">
              <form onSubmit={handleAddComment} className="space-y-2">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Escreva um comentário ou atualização interna..."
                  rows={2}
                  className="w-full bg-[#15151b] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <Send size={12} />
                    Comentar
                  </button>
                </div>
              </form>

              <div className="space-y-3 pt-2">
                {task.comments.map((comm) => (
                  <div key={comm.id} className="p-3 rounded-xl bg-[#16161c] border border-zinc-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={comm.userAvatar} alt={comm.userName} className="w-5 h-5 rounded-full object-cover" />
                        <span className="font-semibold text-zinc-200">{comm.userName}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{comm.createdAt}</span>
                    </div>
                    <p className="text-zinc-300 pl-7">{comm.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: FILES */}
          {activeTab === 'FILES' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <span>Anexos ({task.attachments.length})</span>
              </div>
              <div className="p-6 border border-dashed border-zinc-800 rounded-xl text-center text-xs text-zinc-400">
                <Paperclip size={20} className="mx-auto mb-2 text-zinc-600" />
                <p>Nenhum anexo disponível.</p>
                <span className="text-[10px] text-zinc-600 mt-1 block">O envio de arquivos ainda não está habilitado para tarefas.</span>
              </div>
            </div>
          )}

          {/* TAB 6: HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Log de Atividades
              </div>
              {task.history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <History size={13} className="text-zinc-500" />
                    <span className="text-zinc-300 font-medium">{h.user}</span>
                    <span className="text-zinc-400">{h.action}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{h.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#22222a] bg-[#141419] flex items-center justify-between text-xs">
          <button
            onClick={() => {
              if (confirm('Deseja excluir esta tarefa?')) {
                void onDeleteTask(task.id);
              }
            }}
            className="text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-medium"
          >
            <Trash2 size={14} />
            <span>Excluir</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold shadow-sm"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </>
  );
};
