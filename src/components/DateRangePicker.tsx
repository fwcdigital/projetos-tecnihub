import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarRange, X } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { DatePickerPopover } from './DatePickerPopover';

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
  const popoverId = useId();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!rootRef.current?.contains(target) && !target.closest('[data-date-picker-popover]')) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const startLabel = `${shortDate(startDate)}${showTime && startTime ? ` ${startTime}` : ''}`;
  const dueLabel = `${shortDate(dueDate)}${showTime && dueTime ? ` ${dueTime}` : ''}`;
  const label = startDate ? `${startLabel} → ${dueLabel}` : dueLabel;

  return <div ref={rootRef} className="relative inline-flex" onClick={event => event.stopPropagation()}>
    <button type="button" onClick={() => onChange && setOpen(previous => !previous)} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${onChange ? 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white' : 'border-transparent bg-transparent text-zinc-500'}`} title={title}>
      <CalendarRange size={11} className="shrink-0 text-sky-400" /><span>{label}</span>
    </button>
    {open && onChange && <DatePickerPopover anchorRef={rootRef} popoverId={popoverId} width={320} align="end" zIndex={190} className="rounded-xl border border-zinc-700 bg-[#18181b] p-2.5 shadow-2xl shadow-black/60">
      <div className="mb-2 flex items-center justify-between"><div><p className="text-[11px] font-bold text-zinc-200">{title}</p><p className="text-[9px] text-zinc-600">Data inicial e prazo final</p></div><button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"><X size={12} /></button></div>
      <div className="grid grid-cols-1 gap-1.5">
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
    </DatePickerPopover>}
  </div>;
};
