import React from 'react';
import { Check } from 'lucide-react';
import { Priority } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { PRIORITY_OPTIONS } from './visualTokens';
import { PickerPopover } from './PickerPopover';

interface PriorityPickerProps {
  value: Priority;
  onChange?: (priority: Priority) => void;
}

export const PriorityPicker: React.FC<PriorityPickerProps> = ({ value, onChange }) => {
  if (!onChange) return <PriorityBadge priority={value} size="sm" />;
  return <PickerPopover ariaLabel="Alterar prioridade" width={180} trigger={<span className="inline-flex transition-[filter] hover:brightness-125"><PriorityBadge priority={value} size="sm" /></span>}>
    {close => <>
      <div className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Prioridade</div>
      <div className="space-y-0.5">
        {PRIORITY_OPTIONS.map(option => {
          const selected = option.value === value;
          return <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => {
              onChange(option.value as Priority);
              close();
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${selected ? 'bg-zinc-800' : 'hover:bg-zinc-800/70'}`}
          >
            <PriorityBadge priority={option.value} size="sm" />
            {selected && <Check size={13} className="shrink-0 text-sky-400" />}
          </button>;
        })}
      </div>
    </>}
  </PickerPopover>;
};
