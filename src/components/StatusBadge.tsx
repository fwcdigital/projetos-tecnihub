import React from 'react';
import { ProjectStatus, TaskStatus } from '../types';

interface StatusBadgeProps {
  status: TaskStatus | ProjectStatus | string;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'sm',
  onClick,
  interactive = false
}) => {
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'BACKLOG':
        return {
          label: 'Backlog',
          bg: 'bg-zinc-800/60',
          text: 'text-zinc-400',
          border: 'border-zinc-700/50',
          dot: 'bg-zinc-500',
        };
      case 'A_FAZER':
      case 'AGUARDANDO_INICIO':
        return {
          label: st === 'A_FAZER' ? 'A Fazer' : 'Aguardando Início',
          bg: 'bg-blue-950/40',
          text: 'text-blue-300',
          border: 'border-blue-800/40',
          dot: 'bg-blue-400',
        };
      case 'PLANEJAMENTO':
        return {
          label: 'Planejamento',
          bg: 'bg-indigo-950/40',
          text: 'text-indigo-300',
          border: 'border-indigo-800/40',
          dot: 'bg-indigo-400',
        };
      case 'EM_ANDAMENTO':
        return {
          label: 'Em Andamento',
          bg: 'bg-emerald-950/40',
          text: 'text-emerald-300',
          border: 'border-emerald-800/40',
          dot: 'bg-emerald-400',
        };
      case 'AGUARDANDO_CLIENTE':
        return {
          label: 'Aguardando Cliente',
          bg: 'bg-amber-950/40',
          text: 'text-amber-300',
          border: 'border-amber-800/40',
          dot: 'bg-amber-400',
        };
      case 'EM_REVISAO':
        return {
          label: 'Em Revisão',
          bg: 'bg-purple-950/40',
          text: 'text-purple-300',
          border: 'border-purple-800/40',
          dot: 'bg-purple-400',
        };
      case 'PAUSADO':
        return {
          label: 'Pausado',
          bg: 'bg-zinc-800/80',
          text: 'text-zinc-400',
          border: 'border-zinc-750',
          dot: 'bg-zinc-500',
        };
      case 'CONCLUIDO':
        return {
          label: 'Concluído',
          bg: 'bg-teal-950/40',
          text: 'text-teal-300',
          border: 'border-teal-800/40',
          dot: 'bg-teal-400',
        };
      case 'CANCELADO':
        return {
          label: 'Cancelado',
          bg: 'bg-rose-950/30',
          text: 'text-rose-400',
          border: 'border-rose-900/40',
          dot: 'bg-rose-500',
        };
      case 'BLOQUEADO':
        return {
          label: 'Bloqueado',
          bg: 'bg-red-950/50',
          text: 'text-red-300',
          border: 'border-red-800/50',
          dot: 'bg-red-500',
        };
      default:
        return {
          label: st,
          bg: 'bg-zinc-800/60',
          text: 'text-zinc-300',
          border: 'border-zinc-700/50',
          dot: 'bg-zinc-400',
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] font-medium gap-1.5' 
    : 'px-2.5 py-1 text-xs font-medium gap-2';

  return (
    <span 
      onClick={onClick}
      className={`inline-flex items-center rounded-md border whitespace-nowrap select-none transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${interactive ? 'cursor-pointer hover:brightness-125' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      <span>{config.label}</span>
    </span>
  );
};
