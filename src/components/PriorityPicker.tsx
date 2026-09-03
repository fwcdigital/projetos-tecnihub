import React from 'react';
import { Priority } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { PRIORITY_OPTIONS } from './visualTokens';

interface PriorityPickerProps {
  value: Priority;
  onChange?: (priority: Priority) => void;
}

export const PriorityPicker: React.FC<PriorityPickerProps> = ({ value, onChange }) => {
  if (!onChange) return <PriorityBadge priority={value} size="sm" />;
  return <label className="relative inline-flex cursor-pointer transition-[filter] hover:brightness-125" onClick={event => event.stopPropagation()}>
    <PriorityBadge priority={value} size="sm" />
    <select aria-label="Alterar prioridade" value={value} onChange={event => onChange(event.target.value as Priority)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
      {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
};
