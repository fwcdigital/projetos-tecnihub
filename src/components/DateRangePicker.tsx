import React, { useEffect, useRef, useState } from 'react';
import { CalendarRange, X } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';

export interface DateRangeValue {
  startDate?: string | null;
  dueDate?: string | null;
  startTime?: string | null;
  dueTime?: string | null;
}

interface DateRangePickerProps extends DateRangeValue {
  onChange?: (value: DateRangeValue) => void;
  title?: string;
  requireDueDate?: boolean;
  showTime?: boolean;
  allowClearStart?: boolean;
}

const shortDate = (value?: string | null) => value ? value.split('-').reverse().slice(0, 2).join('/') : '—';

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, dueDate, startTime, dueTime, onChange, title = 'Período', requireDueDate = false, showTime = true, allowClearStart = true }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const startLabel = `${shortDate(startDate)}${showTime && startTime ? ` ${startTime}` : ''}`;
  const dueLabel = `${shortDate(dueDate)}${showTime && dueTime ? ` ${dueTime}` : ''}`;
  const label = startDate ? `${startLabel} → ${dueLabel}` : dueLabel;

  return <div ref={rootRef} className="relative inline-flex" onClick={event => event.stopPropagation()}>
    <button type="button" onClick={() => onChange && setOpen(previous => !previous)} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${onChange ? 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white' : 'border-transparent bg-transparent text-zinc-500'}`} title={title}>
      <CalendarRange size={11} className="shrink-0 text-sky-400" /><span>{label}</span>
    </button>
    {open && onChange && <div className="absolute right-0 top-8 z-[95] w-[350px] rounded-xl border border-zinc-700 bg-[#18181b] p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-200">{title}</p><p className="text-[10px] text-zinc-600">Data inicial e prazo final</p></div><button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"><X size={13} /></button></div>
      <div className="grid grid-cols-1 gap-2">
        <DateTimePicker label="Data inicial" value={startDate || ''} time={startTime} allowClear={allowClearStart} showTime={showTime} onChange={(nextStartDate, nextStartTime) => {
          const normalizedStart = nextStartDate || null;
          const normalizedDue = normalizedStart && dueDate && dueDate < normalizedStart ? normalizedStart : dueDate;
          onChange({ startDate: normalizedStart, startTime: normalizedStart && showTime ? (nextStartTime || null) : null, dueDate: normalizedDue, dueTime });
        }} />
        <DateTimePicker label="Prazo final" value={dueDate || ''} time={dueTime} allowClear={!requireDueDate} showTime={showTime} onChange={(nextDueDate, nextDueTime) => {
          const normalizedDue = startDate && nextDueDate && nextDueDate < startDate ? startDate : (nextDueDate || null);
          onChange({ startDate, startTime, dueDate: normalizedDue, dueTime: normalizedDue && showTime ? (nextDueTime || null) : null });
        }} />
      </div>
    </div>}
  </div>;
};
