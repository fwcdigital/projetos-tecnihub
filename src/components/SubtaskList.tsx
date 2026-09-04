import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Assignee, Priority, Subtask, Task, TaskStatus, User } from '../types';
import { taskService } from '../services/taskService';
import { AssigneePicker } from './AssigneePicker';
import { DateTimePicker } from './DateTimePicker';
import { InlineEditableField } from './InlineEditableField';
import { TaskChecklist } from './TaskChecklist';
import { useAuth } from '../context/AuthContext';
import { canManageTaskAssignments } from '../permissions';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';
import { getCompletedWorkflowStatus, getOpenWorkflowStatus, getWorkflowStatusOptions } from './visualTokens';

interface SubtaskListProps {
  parent: Task;
  users: Array<User | Assignee>;
  onParentUpdate: (task: Task) => void;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ parent, users, onParentUpdate }) => {
  const [title, setTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const available = showCompleted ? parent.subtasks : parent.subtasks.filter(subtask => !subtask.completed && !subtask.statusCompleted);
  const completedCount = parent.subtasks.length - parent.subtasks.filter(subtask => !subtask.completed && !subtask.statusCompleted).length;
  const statusOptions = getWorkflowStatusOptions(parent.workflowStatuses || []);
  const completedStatus = getCompletedWorkflowStatus(parent.workflowStatuses);
  const openStatus = getOpenWorkflowStatus(parent.workflowStatuses);

  const merge = (subtask: Task) => onParentUpdate({ ...parent, subtasks: parent.subtasks.map(item => item.id === subtask.id ? ({ ...item, ...subtask } as Subtask) : item) });
  const update = async (subtask: Subtask, changes: Partial<Task>) => {
    setError('');
    try { merge(await taskService.update(subtask.id, changes)); }
    catch (actionError: any) { setError(actionError.message || 'Não foi possível atualizar a subtarefa.'); }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setError('');
    try {
      const canAssign = Boolean(user && canManageTaskAssignments(user.role));
      const participantIds = canAssign ? parent.participantIds : user ? [user.id] : [];
      const created = await taskService.createSubtask(parent, {
        title: title.trim(), dueDate: parent.dueDate, dueTime: parent.dueTime,
        participantIds, assigneeId: participantIds[0],
        status: openStatus?.id, priority: 'NORMAL', description: ''
      });
      onParentUpdate({ ...parent, subtasks: [...parent.subtasks, created as unknown as Subtask] });
      setTitle('');
    } catch (actionError: any) { setError(actionError.message || 'Não foi possível criar a subtarefa.'); }
  };

  return (
    <div className="space-y-1">
      {error && <p className="mx-10 mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-300">{error}</p>}
      {available.map(subtask => {
        const expanded = expandedIds.includes(subtask.id);
        const complete = subtask.completed || Boolean(subtask.statusCompleted);
        return (
          <div key={subtask.id} className="border-t border-zinc-800/70 first:border-t-0">
            <div className="group/sub flex min-h-9 items-center gap-2 py-1.5 pl-5 pr-2">
              <button type="button" onClick={() => setExpandedIds(ids => expanded ? ids.filter(id => id !== subtask.id) : [...ids, subtask.id])} className="text-zinc-600 hover:text-zinc-300">{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>
              <button type="button" disabled={!(complete ? openStatus : completedStatus)} onClick={() => { const next = complete ? openStatus : completedStatus; if (next) void update(subtask, { status: next.id }); }} className={`flex h-4 w-4 items-center justify-center rounded-full border ${complete ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-zinc-600'}`}>{complete && <Check size={9} strokeWidth={3} />}</button>
              <InlineEditableField value={subtask.title} onSave={value => update(subtask, { title: value })} className={`min-w-0 flex-1 truncate text-left text-xs font-medium ${complete ? 'text-zinc-600 line-through' : 'text-zinc-200'}`} />
              <AssigneePicker users={users} selectedIds={subtask.participantIds || (subtask.assigneeId ? [subtask.assigneeId] : [])} selectedAssignees={subtask.assignees} onChange={ids => void update(subtask, { participantIds: ids })} label="" />
              <div onClick={event => event.stopPropagation()}><PriorityPicker value={subtask.priority || 'NORMAL'} onChange={priority => void update(subtask, { priority })} /></div>
              <div onClick={event => event.stopPropagation()}><StatusPicker value={subtask.status || openStatus?.id || ''} options={statusOptions} onChange={status => void update(subtask, { status: status as TaskStatus })} ariaLabel={`Alterar status de ${subtask.title}`} /></div>
              <DateTimePicker value={subtask.dueDate} time={subtask.dueTime} compact onChange={(date, time) => void update(subtask, { dueDate: date, dueTime: time })} />
              <button type="button" onClick={() => void taskService.delete(subtask.id).then(() => onParentUpdate({ ...parent, subtasks: parent.subtasks.filter(item => item.id !== subtask.id) })).catch(actionError => setError(actionError.message || 'Não foi possível excluir a subtarefa.'))} className="opacity-0 text-zinc-600 hover:text-rose-400 group-hover/sub:opacity-100"><Trash2 size={12} /></button>
            </div>
            {expanded && <div className="ml-12 border-l border-zinc-800 pb-2 pl-3"><TaskChecklist ownerId={subtask.id} items={subtask.checklist || []} users={users} onOwnerUpdate={merge} /></div>}
          </div>
        );
      })}
      {completedCount > 0 && <button type="button" onClick={() => setShowCompleted(value => !value)} className="ml-12 text-[10px] text-zinc-600 hover:text-zinc-300">{showCompleted ? 'Ocultar subtarefas concluídas' : `Ver subtarefas concluídas (${completedCount})`}</button>}
      <form onSubmit={add} className="flex items-center gap-2 border-t border-zinc-800/70 py-2 pl-10 pr-2"><Plus size={12} className="text-zinc-600" /><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Adicionar subtarefa" className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600" /><button className="rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-300">Adicionar</button></form>
    </div>
  );
};
