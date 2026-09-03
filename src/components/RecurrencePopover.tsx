import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Pause, Play, Repeat2, Trash2, X } from 'lucide-react';
import { RecurrenceFrequency, RecurrenceRule, Task } from '../types';
import { routineService } from '../services/routineService';
import { taskService } from '../services/taskService';
import { DateTimePicker } from './DateTimePicker';

interface RecurrencePopoverProps {
  task: Task;
  onChange?: (task: Task) => void;
}

const frequencies: Array<{ value: Exclude<RecurrenceFrequency, 'NAO_REPETIR'>; label: string }> = [
  { value: 'DIARIO', label: 'Diária' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'PERSONALIZADO', label: 'Personalizada' }
];

export const RecurrencePopover: React.FC<RecurrencePopoverProps> = ({ task, onChange }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const recurrence = task.recurrence;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!recurrence) return null;

  const setRule = async (changes: Partial<RecurrenceRule>) => {
    setBusy(true);
    setError('');
    try {
      const updated = await taskService.setRecurrence(task.id, {
        frequency: changes.frequency || recurrence.frequency,
        ruleText: changes.ruleText ?? recurrence.ruleText,
        customIntervalDays: 'customIntervalDays' in changes ? changes.customIntervalDays : recurrence.customIntervalDays,
        nextOccurrenceDate: changes.nextOccurrenceDate || recurrence.nextOccurrenceDate,
        occurrenceTime: 'occurrenceTime' in changes ? (changes.occurrenceTime || null) : recurrence.occurrenceTime
      });
      onChange?.(updated);
    } catch (actionError: any) { setError(actionError.message || 'Não foi possível salvar a recorrência.'); }
    finally { setBusy(false); }
  };

  const setStatus = async (status: 'ACTIVE' | 'PAUSED') => {
    setBusy(true);
    setError('');
    try {
      await routineService.update(recurrence.id, { status });
      onChange?.({ ...task, recurrence: { ...recurrence, status } });
    } catch (actionError: any) { setError(actionError.message || 'Não foi possível alterar a recorrência.'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try { onChange?.(await taskService.removeRecurrence(task.id)); setOpen(false); }
    catch (actionError: any) { setError(actionError.message || 'Não foi possível remover a recorrência.'); }
    finally { setBusy(false); }
  };

  return (
    <div ref={rootRef} className="relative" onClick={event => event.stopPropagation()}>
      <button type="button" onClick={() => setOpen(previous => !previous)} className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/15" title={recurrence.ruleText}>
        <Repeat2 size={10} /><span>Recorrente</span>
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-[90] w-80 rounded-xl border border-zinc-700 bg-[#18181b] p-3 shadow-2xl">
          <div className="mb-3 flex items-start justify-between"><div><p className="text-xs font-bold text-zinc-100">Recorrência da tarefa</p><p className="mt-0.5 text-[10px] text-zinc-500">{recurrence.ruleText}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"><X size={13} /></button></div>
          {error && <p className="mb-3 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-300">{error}</p>}
          <div className="mb-3 flex flex-wrap gap-1">
            {frequencies.map(item => <button key={item.value} disabled={busy} type="button" onClick={() => void setRule({ frequency: item.value, customIntervalDays: item.value === 'PERSONALIZADO' ? (recurrence.customIntervalDays || 7) : undefined })} className={`rounded-md border px-2 py-1 text-[10px] ${item.value === recurrence.frequency ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200'}`}>{item.label}</button>)}
          </div>
          {recurrence.frequency === 'PERSONALIZADO' && <label className="mb-3 block text-[10px] font-semibold text-zinc-500">Intervalo em dias<input type="number" min="1" defaultValue={recurrence.customIntervalDays || 7} onBlur={event => void setRule({ customIntervalDays: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none" /></label>}
          <label className="mb-3 block text-[10px] font-semibold text-zinc-500">Descrição<input defaultValue={recurrence.ruleText} onBlur={event => { const value = event.target.value.trim(); if (value && value !== recurrence.ruleText) void setRule({ ruleText: value }); }} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none" /></label>
          <div className="mb-3"><DateTimePicker label="Próxima ocorrência" value={recurrence.nextOccurrenceDate} time={recurrence.occurrenceTime} onChange={(date, time) => void setRule({ nextOccurrenceDate: date, occurrenceTime: time || null })} /></div>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3"><span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${recurrence.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}><CalendarClock size={11} />{recurrence.status === 'ACTIVE' ? 'Ativa' : recurrence.status === 'PAUSED' ? 'Pausada' : 'Encerrada'}</span><div className="flex gap-1">{recurrence.status === 'ACTIVE' ? <button disabled={busy} type="button" onClick={() => void setStatus('PAUSED')} className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] text-amber-300 hover:bg-zinc-700"><Pause size={11} />Pausar</button> : <button disabled={busy} type="button" onClick={() => void setStatus('ACTIVE')} className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] text-emerald-300 hover:bg-zinc-700"><Play size={11} />Reativar</button>}<button disabled={busy} type="button" onClick={() => { if (window.confirm('Remover a recorrência desta tarefa?')) void remove(); }} className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400" title="Remover recorrência"><Trash2 size={12} /></button></div></div>
        </div>
      )}
    </div>
  );
};
