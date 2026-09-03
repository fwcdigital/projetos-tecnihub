import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, CirclePause, Clock3, Pencil, Play, Repeat2, Search, SquareArrowOutUpRight, StopCircle, Trash2 } from 'lucide-react';
import { RecurrenceFrequency, RecurrenceRule, Task } from '../types';
import { AvatarGroup } from '../components/AvatarGroup';
import { DateTimePicker } from '../components/DateTimePicker';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

interface RecurrencesViewProps {
  routines: RecurrenceRule[];
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateRoutine: (id: string, updates: Partial<RecurrenceRule>) => Promise<void>;
  onRemoveRoutine: (id: string) => Promise<void>;
}

const frequencyLabels: Record<Exclude<RecurrenceFrequency, 'NAO_REPETIR'>, string> = {
  DIARIO: 'Diariamente', SEMANAL: 'Semanalmente', QUINZENAL: 'Quinzenalmente',
  MENSAL: 'Mensalmente', PERSONALIZADO: 'Personalizado'
};
const statusLabels = { ACTIVE: 'Ativa', PAUSED: 'Pausada', ENDED: 'Encerrada' };
const formatDate = (value: string) => value ? value.split('-').reverse().join('/') : '—';

export const RecurrencesView: React.FC<RecurrencesViewProps> = ({ routines, tasks, onSelectTask, onUpdateRoutine, onRemoveRoutine }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | RecurrenceRule['status']>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => routines.filter(routine => {
    if (status !== 'ALL' && routine.status !== status) return false;
    if (!search.trim()) return true;
    const term = search.toLocaleLowerCase('pt-BR');
    return [routine.title, routine.projectName, routine.clientName, routine.ruleText]
      .some(value => value.toLocaleLowerCase('pt-BR').includes(term));
  }), [routines, search, status]);

  const update = async (id: string, changes: Partial<RecurrenceRule>) => {
    setBusyId(id);
    try { await onUpdateRoutine(id, changes); } finally { setBusyId(null); }
  };
  const openSourceTask = (routine: RecurrenceRule) => {
    const source = tasks.find(task => task.id === routine.sourceTaskId);
    if (source) onSelectTask(source);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Repeat2 size={16} /></span><h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Rotinas</h1><span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300">{filtered.length}</span></div>
          <p className="mt-1 text-xs text-zinc-400">Regras de recorrência conectadas às tarefas originais e suas próximas ocorrências.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[230px] flex-1 lg:flex-none"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar rotina, projeto ou cliente" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-500" /></div>
          <select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none"><option value="ALL">Todas</option><option value="ACTIVE">Ativas</option><option value="PAUSED">Pausadas</option><option value="ENDED">Encerradas</option></select>
        </div>
      </div>

      <div className="overflow-visible rounded-xl border border-zinc-800 bg-[#111115]">
        <div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(150px,.8fr)_minmax(210px,1fr)_150px_120px] gap-3 border-b border-zinc-800 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 lg:grid"><span>Rotina</span><span>Responsáveis</span><span>Recorrência</span><span>Próxima ocorrência</span><span className="text-right">Ações</span></div>
        <div className="divide-y divide-zinc-800">
          {filtered.map(routine => {
            const editing = editingId === routine.id;
            const busy = busyId === routine.id;
            return (
              <article key={routine.id} className={`grid gap-3 px-4 py-3 transition-colors hover:bg-zinc-900/50 lg:grid-cols-[minmax(260px,1.4fr)_minmax(150px,.8fr)_minmax(210px,1fr)_150px_120px] lg:items-center ${routine.status === 'ENDED' ? 'opacity-55' : ''}`}>
                <div className="min-w-0"><div className="flex items-center gap-2"><button type="button" onClick={() => openSourceTask(routine)} className="truncate text-left text-xs font-bold text-zinc-100 hover:text-sky-300">{routine.title}</button><PriorityBadge priority={routine.priority} size="sm" /><StatusBadge status={routine.status} label={statusLabels[routine.status]} size="sm" /></div><div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-zinc-500"><span className="truncate">{routine.clientName}</span><span>•</span><span className="truncate">{routine.projectName}</span></div></div>
                <div><AvatarGroup assignees={routine.assignees} /></div>
                <div className="min-w-0">{editing ? <div className="flex flex-col gap-1.5"><select value={routine.frequency} onChange={event => { const frequency = event.target.value as RecurrenceRule['frequency']; void update(routine.id, { frequency, customIntervalDays: frequency === 'PERSONALIZADO' ? (routine.customIntervalDays || 7) : undefined }); }} className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-300 outline-none">{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{routine.frequency === 'PERSONALIZADO' && <input type="number" min="1" defaultValue={routine.customIntervalDays || 7} onBlur={event => void update(routine.id, { customIntervalDays: Math.max(1, Number(event.target.value) || 1) })} className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none" aria-label="Intervalo personalizado em dias" />}<input defaultValue={routine.ruleText} onBlur={event => void update(routine.id, { ruleText: event.target.value })} className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none" aria-label="Descrição da recorrência" /></div> : <div className="flex items-start gap-2"><CalendarClock size={13} className="mt-0.5 shrink-0 text-emerald-400" /><div><p className="text-[11px] font-semibold text-zinc-300">{routine.ruleText || frequencyLabels[routine.frequency]}</p><p className="text-[10px] text-zinc-600">{frequencyLabels[routine.frequency]}</p></div></div>}</div>
                <div>{editing ? <DateTimePicker compact value={routine.nextOccurrenceDate} time={routine.occurrenceTime} onChange={(nextOccurrenceDate, occurrenceTime) => void update(routine.id, { nextOccurrenceDate, occurrenceTime })} /> : <div className="flex items-center gap-1.5 text-[11px] text-zinc-300"><Clock3 size={12} className="text-sky-400" /><span>{formatDate(routine.nextOccurrenceDate)}</span>{routine.occurrenceTime && <span className="text-zinc-600">{routine.occurrenceTime}</span>}</div>}</div>
                <div className="flex items-center justify-end gap-1" aria-busy={busy}>
                  <button type="button" onClick={() => openSourceTask(routine)} title="Abrir tarefa original" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-sky-300"><SquareArrowOutUpRight size={13} /></button>
                  <button type="button" onClick={() => setEditingId(editing ? null : routine.id)} title="Editar recorrência" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white">{editing ? <CheckCircle2 size={13} /> : <Pencil size={13} />}</button>
                  {routine.status === 'ACTIVE' && <button disabled={busy} type="button" onClick={() => void update(routine.id, { status: 'PAUSED' })} title="Pausar" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-amber-300"><CirclePause size={13} /></button>}
                  {routine.status !== 'ACTIVE' && <button disabled={busy} type="button" onClick={() => void update(routine.id, { status: 'ACTIVE' })} title="Reativar" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-300"><Play size={13} /></button>}
                  {routine.status !== 'ENDED' && <button disabled={busy} type="button" onClick={() => void update(routine.id, { status: 'ENDED' })} title="Encerrar" className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-300"><StopCircle size={13} /></button>}
                  <button disabled={busy} type="button" onClick={() => { if (window.confirm('Remover a recorrência? A tarefa original será mantida.')) void onRemoveRoutine(routine.id); }} title="Remover recorrência" className="rounded p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"><Trash2 size={13} /></button>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && <div className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center"><Repeat2 size={24} className="text-zinc-700" /><p className="text-sm font-semibold text-zinc-400">Nenhuma rotina encontrada</p><p className="max-w-sm text-[11px] text-zinc-600">Configure a recorrência dentro de uma tarefa. Ela aparecerá aqui automaticamente, sem duplicar a tarefa original.</p></div>}
        </div>
      </div>
    </div>
  );
};
