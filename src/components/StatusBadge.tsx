import React from 'react';
import { ProjectStatus, TaskStatus } from '../types';
import { getStatusVisual } from './visualTokens';

interface StatusBadgeProps {
  status: TaskStatus | ProjectStatus | string;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
  label?: string;
  color?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'sm',
  onClick,
  interactive = false,
  label,
  color
}) => {
  const config = getStatusVisual(status);
  const customStyle = color ? { color, borderColor: `${color}66`, backgroundColor: `${color}18` } : undefined;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] font-medium gap-1.5' 
    : 'px-2.5 py-1 text-xs font-medium gap-2';

  return (
    <span 
      onClick={onClick}
      style={customStyle}
      className={`inline-flex items-center rounded-md border whitespace-nowrap select-none transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${interactive ? 'cursor-pointer hover:brightness-125' : ''}`}
    >
      <span style={color ? { backgroundColor: color } : undefined} className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      <span>{label || config.label}</span>
    </span>
  );
};
