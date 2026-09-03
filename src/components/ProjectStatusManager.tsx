import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import type { ProjectStatusDefinition } from '../types';
import { projectStatusService } from '../services/projectStatusService';

interface Props {
  statuses: ProjectStatusDefinition[];
  onChanged: () => Promise<void>;
}

export const ProjectStatusManager: React.FC<Props> = ({ statuses, onChanged }) => {
  const [drafts, setDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#38BDF8');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDrafts(Object.fromEntries(statuses.map(status => [status.id, { name: status.name, color: status.color }])));
  }, [statuses]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await onChanged();
    } catch (actionError: any) {
      setError(actionError.message || 'Não foi possível salvar a alteração.');
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= statuses.length) return;
    const ids = statuses.map(status => status.id);
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    void run(statuses[index].id, () => projectStatusService.reorder(ids));
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#121216] p-4">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-zinc-100">Status de projeto</h2>
        <p className="mt-1 text-xs text-zinc-500">Nome, cor, ordem e disponibilidade das opções usadas em projetos.</p>
      </div>
      {error && <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      <form
        onSubmit={event => {
          event.preventDefault();
          const name = newName.trim();
          if (!name) return;
          void run('new', async () => {
            await projectStatusService.create(name, newColor);
            setNewName('');
          });
        }}
        className="mb-3 grid grid-cols-[1fr_48px_auto] gap-2"
      >
        <input value={newName} onChange={event => setNewName(event.target.value)} placeholder="Novo status" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500" />
        <input type="color" value={newColor} onChange={event => setNewColor(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 p-1" title="Cor do status" />
        <button disabled={busyId === 'new' || !newName.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40">{busyId === 'new' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Adicionar</button>
      </form>
      <div className="divide-y divide-zinc-800">
        {statuses.map((status, index) => {
          const draft = drafts[status.id] || { name: status.name, color: status.color };
          const busy = busyId === status.id;
          return (
            <div key={status.id} className={`grid items-center gap-2 py-2 sm:grid-cols-[28px_1fr_48px_90px_76px_30px_30px_76px] ${status.active ? '' : 'opacity-60'}`}>
              <span style={{ backgroundColor: draft.color }} className="h-2.5 w-2.5 rounded-full" />
              <input value={draft.name} onChange={event => setDrafts(previous => ({ ...previous, [status.id]: { ...draft, name: event.target.value } }))} className="min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600" />
              <input type="color" value={draft.color} onChange={event => setDrafts(previous => ({ ...previous, [status.id]: { ...draft, color: event.target.value } }))} className="h-8 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-1" />
              <span className="text-[10px] text-zinc-500">{status.projectsCount} projeto(s)</span>
              <button type="button" disabled={busy} onClick={() => void run(status.id, () => projectStatusService.update(status.id, draft))} className="inline-flex items-center justify-center gap-1 rounded border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"><Save size={11} />Salvar</button>
              <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para cima"><ArrowUp size={13} /></button>
              <button type="button" disabled={busy || index === statuses.length - 1} onClick={() => move(index, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para baixo"><ArrowDown size={13} /></button>
              <button type="button" disabled={busy} onClick={() => void run(status.id, () => status.active ? projectStatusService.remove(status.id) : projectStatusService.update(status.id, { active: true }))} className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[10px] ${status.active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title={status.projectsCount > 0 ? 'Status em uso será desativado' : 'Remover status sem uso'}>{status.active ? <Trash2 size={11} /> : <Plus size={11} />}{status.active ? (status.projectsCount > 0 ? 'Desativar' : 'Remover') : 'Reativar'}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
