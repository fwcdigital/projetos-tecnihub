import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, MoreHorizontal, RotateCcw } from 'lucide-react';
import { Task } from '../types';
import { isTaskCompleted } from './visualTokens';

interface TaskActionsMenuProps {
  task: Task;
  onOpen: () => void;
  onToggleComplete: (event: React.MouseEvent) => void;
}

export const TaskActionsMenu: React.FC<TaskActionsMenuProps> = ({ task, onOpen, onToggleComplete }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const completed = isTaskCompleted(task);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={rootRef} className="relative" onClick={event => event.stopPropagation()}>
      <button type="button" onClick={() => setOpen(previous => !previous)} className="rounded p-1 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-200 focus:opacity-100 group-hover:opacity-100" title="Ações da tarefa" aria-expanded={open}><MoreHorizontal size={14} /></button>
      {open && <div className="absolute right-0 top-7 z-[90] w-44 rounded-lg border border-zinc-700 bg-[#18181b] p-1 shadow-2xl"><button type="button" onClick={() => { onOpen(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"><ExternalLink size={12} />Abrir detalhes</button><button type="button" onClick={event => { onToggleComplete(event); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white">{completed ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}{completed ? 'Reabrir tarefa' : 'Concluir tarefa'}</button></div>}
    </div>
  );
};
