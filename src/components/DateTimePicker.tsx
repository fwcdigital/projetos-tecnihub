import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
  value?: string;
  time?: string | null;
  onChange: (date: string, time?: string) => void;
  label?: string;
  compact?: boolean;
  allowClear?: boolean;
  showTime?: boolean;
}

const isoDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, time, onChange, label = 'Data', compact, allowClear = false, showTime = true }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => value ? new Date(`${value}T12:00:00`) : new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const start = new Date(year, monthIndex, 1);
    const first = new Date(year, monthIndex, 1 - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return { date, value: isoDate(date), current: date.getMonth() === monthIndex };
    });
  }, [month]);

  const shortcuts = [
    ['Hoje', 0], ['Mais tarde', 0], ['Amanhã', 1], ['Este final de semana', 6 - new Date().getDay()],
    ['Semana que vem', 7], ['2 semanas', 14], ['4 semanas', 28]
  ] as const;

  const chooseShortcut = (daysAhead: number, withTime = false) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    onChange(isoDate(date), withTime ? (time || '18:00') : time);
    setMonth(date);
    setOpen(false);
  };

  const display = value ? value.split('-').reverse().join('/') : 'Sem data';

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={event => { event.stopPropagation(); setOpen(previous => !previous); }} className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white ${compact ? 'px-2 py-1 text-[10px]' : 'w-full px-3 py-2 text-xs'}`}>
        <CalendarDays size={compact ? 11 : 13} className="text-sky-400" />
        <span>{label && !compact ? `${label}: ` : ''}{display}</span>
        {time && <span className="text-zinc-500">{time}</span>}
      </button>

      {open && (
        <div onClick={event => event.stopPropagation()} className="absolute left-0 z-[80] mt-2 grid w-[600px] max-w-[calc(100vw-2rem)] grid-cols-[190px_1fr] overflow-hidden rounded-xl border border-zinc-700 bg-[#171719] shadow-2xl max-sm:grid-cols-1">
          <div className="border-r border-zinc-800 p-2 max-sm:hidden">
            {shortcuts.map(([shortcut, daysAhead]) => (
              <button key={shortcut} type="button" onClick={() => chooseShortcut(daysAhead, shortcut === 'Mais tarde')} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white">
                <span>{shortcut}</span><span className="text-[10px] text-zinc-600">{isoDate(new Date(Date.now() + daysAhead * 86400000)).split('-').slice(1).reverse().join('/')}</span>
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-800 p-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"><CalendarDays size={12} /><span>{display}</span>{allowClear && value && <button type="button" onClick={() => onChange('', time)} className="ml-auto text-zinc-600 hover:text-zinc-300"><X size={12} /></button>}</div>
              {showTime && <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"><Clock size={12} className="text-zinc-500" /><input type="time" value={time || ''} onChange={event => onChange(value || isoDate(new Date()), event.target.value || undefined)} className="w-[82px] bg-transparent text-zinc-200 outline-none [color-scheme:dark]" /></div>}
            </div>
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-zinc-100">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><div className="flex gap-1"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"><ChevronLeft size={14} /></button><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"><ChevronRight size={14} /></button></div></div>
              <div className="grid grid-cols-7 text-center text-[10px] text-zinc-600">{['dom','seg','ter','qua','qui','sex','sáb'].map(day => <span key={day} className="py-1">{day}</span>)}</div>
              <div className="grid grid-cols-7 gap-0.5">{days.map(day => <button key={day.value} type="button" onClick={() => { onChange(day.value, time); setOpen(false); }} className={`h-8 rounded-md text-[11px] ${day.value === value ? 'bg-sky-500 font-bold text-white' : day.current ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-900'}`}>{day.date.getDate()}</button>)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
