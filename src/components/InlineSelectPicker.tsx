import React from 'react';
import { ChevronDown } from 'lucide-react';

interface InlineSelectPickerProps {
  value: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
  ariaLabel: string;
}

export const InlineSelectPicker: React.FC<InlineSelectPickerProps> = ({ value, label, options, onChange, icon, ariaLabel }) => {
  if (!onChange) return <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-zinc-500">{icon}<span className="truncate">{label}</span></span>;
  return <label className="relative inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[10px] text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100" onClick={event => event.stopPropagation()}>
    {icon}<span className="truncate">{label}</span><ChevronDown size={10} className="shrink-0 text-zinc-600" />
    <select aria-label={ariaLabel} value={value} onChange={event => onChange(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
};
