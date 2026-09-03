import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface HierarchyExpandButtonProps {
  expanded: boolean;
  count: number;
  onToggle: () => void;
}

export const HierarchyExpandButton: React.FC<HierarchyExpandButtonProps> = ({ expanded, count, onToggle }) => (
  <button
    type="button"
    onClick={event => { event.stopPropagation(); onToggle(); }}
    className={`inline-flex h-6 min-w-10 items-center justify-center gap-0.5 rounded-full border px-1.5 text-[10px] font-bold transition-colors ${expanded ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'}`}
    title={expanded ? 'Recolher subtarefas e checklist' : 'Expandir subtarefas e checklist'}
    aria-expanded={expanded}
  >
    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    <span>{count}</span>
  </button>
);
