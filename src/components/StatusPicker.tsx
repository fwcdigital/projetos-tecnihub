import React from 'react';
import { Check } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PickerPopover } from './PickerPopover';

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

  return <PickerPopover ariaLabel={ariaLabel} align="end" width={220} trigger={<StatusBadge status={value} label={current.label} color={current.color} size={size} interactive />}>
    {close => <>
      <div className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Status</div>
      <div className="space-y-0.5">
        {options.map(option => {
          const selected = option.value === value;
          return <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => {
              onChange(option.value);
              close();
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${selected ? 'bg-zinc-800' : 'hover:bg-zinc-800/70'} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <StatusBadge status={option.value} label={option.label} color={option.color} size="sm" />
            {selected && <Check size={13} className="shrink-0 text-sky-400" />}
          </button>;
        })}
      </div>
    </>}
  </PickerPopover>;
};
