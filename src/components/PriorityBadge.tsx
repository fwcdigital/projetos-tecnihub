import React from 'react';
import { Priority } from '../types';
import { AlertCircle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  priority, 
  size = 'sm',
  showLabel = true 
}) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'URGENTE':
        return {
          label: 'Urgente',
          color: 'text-rose-400',
          bg: 'bg-rose-950/40 border-rose-800/40',
          icon: AlertCircle,
          iconColor: 'text-rose-400',
        };
      case 'ALTA':
        return {
          label: 'Alta',
          color: 'text-amber-400',
          bg: 'bg-amber-950/40 border-amber-800/40',
          icon: ArrowUp,
          iconColor: 'text-amber-400',
        };
      case 'NORMAL':
        return {
          label: 'Normal',
          color: 'text-sky-400',
          bg: 'bg-sky-950/30 border-sky-800/30',
          icon: ArrowRight,
          iconColor: 'text-sky-400',
        };
      case 'BAIXA':
      default:
        return {
          label: 'Baixa',
          color: 'text-zinc-400',
          bg: 'bg-zinc-800/40 border-zinc-700/40',
          icon: ArrowDown,
          iconColor: 'text-zinc-400',
        };
    }
  };

  const config = getPriorityConfig();
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={`inline-flex items-center gap-1 rounded border font-medium ${config.bg} ${config.color} ${size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'}`}>
      <Icon size={iconSize} className={config.iconColor} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
