import React from 'react';
import { Priority } from '../types';
import { Flag } from 'lucide-react';
import { getPriorityVisual } from './visualTokens';

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
  const config = getPriorityVisual(priority);
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium ${config.surface} ${config.color} ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}>
      <Flag size={iconSize} fill="currentColor" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
