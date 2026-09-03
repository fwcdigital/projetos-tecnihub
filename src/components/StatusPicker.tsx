import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface StatusPickerOption {
  value: string;
  label: string;
  color?: string;
  disabled?: boolean;
}

interface StatusPickerProps {
  value: string;
  options: StatusPickerOption[];
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export const StatusPicker: React.FC<StatusPickerProps> = ({ value, options, onChange, size = 'sm', ariaLabel = 'Alterar status' }) => {
  const current = options.find(option => option.value === value) || { value, label: value };
  if (!onChange) return <StatusBadge status={value} label={current.label} color={current.color} size={size} />;

  return (
    <label className="relative inline-flex cursor-pointer" onClick={event => event.stopPropagation()}>
      <StatusBadge status={value} label={current.label} color={current.color} size={size} interactive />
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </label>
  );
};
