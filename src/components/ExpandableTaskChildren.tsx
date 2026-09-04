import React from 'react';
import { CheckSquare, ListTree } from 'lucide-react';
import { Assignee, Task, User } from '../types';
import { SubtaskList } from './SubtaskList';
import { TaskChecklist } from './TaskChecklist';

interface ExpandableTaskChildrenProps {
  task: Task;
  users: Array<User | Assignee>;
  onUpdateTask: (task: Task) => void;
}

export const ExpandableTaskChildren: React.FC<ExpandableTaskChildrenProps> = ({ task, users, onUpdateTask }) => (
  <div className="border-x border-b border-zinc-800 bg-[#0e0e12]">
    <div className="flex items-center gap-2 border-b border-zinc-800/70 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500"><ListTree size={12} />Subtarefas <span className="font-mono">{task.subtasks.filter(item => item.completed || item.statusCompleted).length}/{task.subtasks.length}</span></div>
    <SubtaskList parent={task} users={users} onParentUpdate={onUpdateTask} />
    <div className="flex items-center gap-2 border-y border-zinc-800/70 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500"><CheckSquare size={12} />Checklist <span className="font-mono">{task.checklist.filter(item => item.completed).length}/{task.checklist.length}</span></div>
    <div className="px-5 py-2"><TaskChecklist ownerId={task.id} items={task.checklist} users={users} onOwnerUpdate={onUpdateTask} /></div>
  </div>
);
