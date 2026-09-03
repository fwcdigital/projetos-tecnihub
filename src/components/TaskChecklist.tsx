import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Assignee, ChecklistItem, Task, User } from '../types';
import { taskService } from '../services/taskService';
import { AssigneePicker } from './AssigneePicker';
import { DateTimePicker } from './DateTimePicker';
import { InlineEditableField } from './InlineEditableField';

interface TaskChecklistProps {
  ownerId: string;
  items: ChecklistItem[];
  users: Array<User | Assignee>;
  onOwnerUpdate: (owner: Task) => void;
}

export const TaskChecklist: React.FC<TaskChecklistProps> = ({ ownerId, items, users, onOwnerUpdate }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string[]>([]);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setError('');
    try { await action(); }
    catch (actionError: any) { setError(actionError.message || 'Não foi possível salvar o checklist.'); }
  };

  const update = async (item: ChecklistItem, changes: Partial<ChecklistItem>) => {
    await run(async () => onOwnerUpdate(await taskService.updateChecklistItem(ownerId, item.id, changes)));
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await run(async () => {
      onOwnerUpdate(await taskService.addChecklistItem(ownerId, {
        title: title.trim(),
        dueDate: dueDate || undefined,
        assigneeId: assigneeId[0]
      }));
      setTitle(''); setDueDate(''); setAssigneeId([]);
    });
  };

  const move = async (item: ChecklistItem, index: number, delta: -1 | 1) => {
    const target = items[index + delta];
    if (!target) return;
    const currentPosition = item.position ?? index;
    const targetPosition = target.position ?? index + delta;
    await run(async () => {
      await taskService.updateChecklistItem(ownerId, item.id, { position: targetPosition });
      onOwnerUpdate(await taskService.updateChecklistItem(ownerId, target.id, { position: currentPosition }));
    });
  };

  return (
    <div className="space-y-1.5">
      {error && <p className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-300">{error}</p>}
      {items.map((item, index) => (
        <div key={item.id} className="group/check flex min-h-8 items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-900/80">
          <button type="button" onClick={() => void update(item, { completed: !item.completed })} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.completed ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-zinc-600 bg-zinc-950'}`}>{item.completed && <Check size={10} strokeWidth={3} />}</button>
          <InlineEditableField value={item.title} onSave={value => update(item, { title: value })} className={`min-w-0 flex-1 truncate text-left text-[11px] ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`} />
          <AssigneePicker users={users} selectedIds={item.assigneeId ? [item.assigneeId] : []} onChange={ids => void update(item, { assigneeId: ids[0] || null })} label="" required={false} />
          <DateTimePicker value={item.dueDate} time={item.dueTime} compact allowClear onChange={(date, time) => void update(item, { dueDate: date || null, dueTime: date ? (time || null) : null })} />
          <span className="flex opacity-0 group-hover/check:opacity-100"><button type="button" disabled={index === 0} onClick={() => void move(item, index, -1)} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20" title="Mover para cima"><ChevronUp size={11} /></button><button type="button" disabled={index === items.length - 1} onClick={() => void move(item, index, 1)} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20" title="Mover para baixo"><ChevronDown size={11} /></button></span>
          <button type="button" onClick={() => void run(async () => onOwnerUpdate(await taskService.deleteChecklistItem(ownerId, item.id)))} className="opacity-0 text-zinc-600 hover:text-rose-400 group-hover/check:opacity-100"><Trash2 size={12} /></button>
        </div>
      ))}
      <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-2">
        <Plus size={12} className="text-zinc-600" />
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Adicionar item ao checklist" className="min-w-[150px] flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600" />
        <div className="w-32"><AssigneePicker users={users} selectedIds={assigneeId} onChange={setAssigneeId} label="" required={false} /></div>
        <DateTimePicker value={dueDate} compact allowClear onChange={date => setDueDate(date)} />
        <button type="submit" className="rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700">Adicionar</button>
      </form>
    </div>
  );
};
