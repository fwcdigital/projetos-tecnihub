import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronRight, Loader2, Plus, Power, PowerOff, Save } from 'lucide-react';
import type { ProductDefinition, ProductStatusDefinition } from '../types';
import { productService } from '../services/productService';

const DEFAULT_COLOR = '#38BDF8';

interface StatusEditorProps {
  product: ProductDefinition;
  onChanged: () => Promise<void>;
}

const ProductStatusEditor: React.FC<StatusEditorProps> = ({ product, onChanged }) => {
  const [statuses, setStatuses] = useState<ProductStatusDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [busyId, setBusyId] = useState<string | null>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const fetched = await productService.getStatuses(product.id, true);
    setStatuses(fetched);
    setDrafts(Object.fromEntries(fetched.map(status => [status.id, { name: status.name, color: status.color }])));
  }, [product.id]);

  useEffect(() => {
    setBusyId('loading');
    setError('');
    load().catch(actionError => setError(actionError.message || 'Não foi possível carregar os status.')).finally(() => setBusyId(null));
  }, [load]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await Promise.all([load(), onChanged()]);
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
    void run(statuses[index].id, () => productService.reorderStatuses(product.id, ids));
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/35 px-3 py-3 sm:px-5">
      <div className="mb-3">
        <h3 className="text-xs font-bold text-zinc-200">Status de {product.name}</h3>
        <p className="mt-0.5 text-[10px] text-zinc-500">Ordem, cor e disponibilidade exclusivas deste produto.</p>
      </div>
      {error && <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      <form
        onSubmit={event => {
          event.preventDefault();
          const name = newName.trim();
          if (!name) return;
          void run('new-status', async () => {
            await productService.createStatus(product.id, name, newColor);
            setNewName('');
          });
        }}
        className="mb-3 grid gap-2 sm:grid-cols-[1fr_48px_auto]"
      >
        <input value={newName} onChange={event => setNewName(event.target.value)} placeholder="Novo status deste produto" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500" />
        <input type="color" value={newColor} onChange={event => setNewColor(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 p-1" title="Cor do status" />
        <button disabled={busyId === 'new-status' || !newName.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40">{busyId === 'new-status' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Adicionar status</button>
      </form>
      {busyId === 'loading' ? (
        <div className="flex items-center gap-2 py-4 text-xs text-zinc-500"><Loader2 size={14} className="animate-spin" />Carregando status...</div>
      ) : (
        <div className="divide-y divide-zinc-800/80">
          {statuses.map((status, index) => {
            const draft = drafts[status.id] || { name: status.name, color: status.color };
            const busy = busyId === status.id;
            return (
              <div key={status.id} className={`grid items-center gap-2 py-2 sm:grid-cols-[16px_1fr_48px_82px_122px_76px_28px_28px_82px] ${status.active ? '' : 'opacity-55'}`}>
                <span style={{ backgroundColor: draft.color }} className="h-2.5 w-2.5 rounded-full" />
                <input value={draft.name} onChange={event => setDrafts(previous => ({ ...previous, [status.id]: { ...draft, name: event.target.value } }))} className="min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600" />
                <input type="color" value={draft.color} onChange={event => setDrafts(previous => ({ ...previous, [status.id]: { ...draft, color: event.target.value } }))} className="h-8 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-1" title="Cor do status" />
                <button type="button" disabled={busy} onClick={() => void run(status.id, () => productService.updateStatus(product.id, status.id, { isCompleted: !status.isCompleted }))} className={`inline-flex items-center justify-center gap-1 rounded border px-2 py-1.5 text-[10px] ${status.isCompleted ? 'border-teal-700/60 bg-teal-950/35 text-teal-300' : 'border-zinc-700 text-zinc-500 hover:bg-zinc-800'}`} title="Define se este status conclui projetos e tarefas"><CheckCircle2 size={11} />Finaliza</button>
                <span className="text-[10px] text-zinc-500">{status.projectsCount} proj. · {status.tasksCount} tarefas</span>
                <button type="button" disabled={busy} onClick={() => void run(status.id, () => productService.updateStatus(product.id, status.id, draft))} className="inline-flex items-center justify-center gap-1 rounded border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"><Save size={11} />Salvar</button>
                <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para cima"><ArrowUp size={13} /></button>
                <button type="button" disabled={busy || index === statuses.length - 1} onClick={() => move(index, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para baixo"><ArrowDown size={13} /></button>
                <button type="button" disabled={busy} onClick={() => void run(status.id, () => status.active ? productService.removeStatus(product.id, status.id) : productService.updateStatus(product.id, status.id, { active: true }))} className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[10px] ${status.active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title={status.projectsCount > 0 || status.tasksCount > 0 ? 'Status em uso será desativado' : undefined}>{status.active ? <PowerOff size={11} /> : <Power size={11} />}{status.active ? (status.projectsCount > 0 || status.tasksCount > 0 ? 'Desativar' : 'Remover') : 'Reativar'}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProductManager: React.FC<{ onCatalogChanged?: () => Promise<void> }> = ({ onCatalogChanged }) => {
  const [products, setProducts] = useState<ProductDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [busyId, setBusyId] = useState<string | null>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const fetched = await productService.getAll(true);
    setProducts(fetched);
    setDrafts(Object.fromEntries(fetched.map(product => [product.id, { name: product.name, color: product.color }])));
  }, []);

  useEffect(() => {
    load().catch(actionError => setError(actionError.message || 'Não foi possível carregar os produtos.')).finally(() => setBusyId(null));
  }, [load]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await load();
      await onCatalogChanged?.();
    } catch (actionError: any) {
      setError(actionError.message || 'Não foi possível salvar a alteração.');
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= products.length) return;
    const ids = products.map(product => product.id);
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    void run(products[index].id, () => productService.reorder(ids));
  };

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#121216]">
      <div className="p-4">
        <h2 className="text-sm font-bold text-zinc-100">Produtos</h2>
        <p className="mt-1 text-xs text-zinc-500">Catálogo operacional e workflows de status utilizados por projetos e tarefas.</p>
      </div>
      <div className="border-y border-zinc-800 bg-zinc-950/25 p-4">
        {error && <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
        <form
          onSubmit={event => {
            event.preventDefault();
            const name = newName.trim();
            if (!name) return;
            void run('new-product', async () => {
              await productService.create(name, newColor);
              setNewName('');
            });
          }}
          className="grid gap-2 sm:grid-cols-[1fr_48px_auto]"
        >
          <input value={newName} onChange={event => setNewName(event.target.value)} placeholder="Novo produto" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500" />
          <input type="color" value={newColor} onChange={event => setNewColor(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 p-1" title="Cor do produto" />
          <button disabled={busyId === 'new-product' || !newName.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40">{busyId === 'new-product' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Adicionar produto</button>
        </form>
      </div>
      {busyId === 'loading' ? (
        <div className="flex items-center gap-2 p-4 text-xs text-zinc-500"><Loader2 size={14} className="animate-spin" />Carregando produtos...</div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {products.map((product, index) => {
            const draft = drafts[product.id] || { name: product.name, color: product.color };
            const busy = busyId === product.id;
            const expanded = expandedId === product.id;
            return (
              <div key={product.id} className={product.active ? '' : 'opacity-60'}>
                <div className="grid items-center gap-2 px-3 py-3 sm:grid-cols-[28px_16px_1fr_48px_142px_76px_28px_28px_86px]">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : product.id)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white" title={expanded ? 'Ocultar status' : 'Administrar status'}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                  <span style={{ backgroundColor: draft.color }} className="h-3 w-3 rounded-full" />
                  <input value={draft.name} onChange={event => setDrafts(previous => ({ ...previous, [product.id]: { ...draft, name: event.target.value } }))} className="min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs font-semibold text-zinc-200 outline-none focus:border-zinc-600" />
                  <input type="color" value={draft.color} onChange={event => setDrafts(previous => ({ ...previous, [product.id]: { ...draft, color: event.target.value } }))} className="h-8 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-1" title="Cor do produto" />
                  <button type="button" onClick={() => setExpandedId(expanded ? null : product.id)} className="text-left text-[10px] text-zinc-500 hover:text-zinc-300">{product.statusesCount} status · {product.projectsCount} projeto(s)</button>
                  <button type="button" disabled={busy} onClick={() => void run(product.id, () => productService.update(product.id, draft))} className="inline-flex items-center justify-center gap-1 rounded border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"><Save size={11} />Salvar</button>
                  <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para cima"><ArrowUp size={13} /></button>
                  <button type="button" disabled={busy || index === products.length - 1} onClick={() => move(index, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para baixo"><ArrowDown size={13} /></button>
                  <button type="button" disabled={busy} onClick={() => void run(product.id, () => product.active ? productService.remove(product.id) : productService.update(product.id, { active: true }))} className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[10px] ${product.active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title={product.projectsCount > 0 || product.statusesCount > 0 ? 'Produto relacionado será desativado' : undefined}>{product.active ? <PowerOff size={11} /> : <Power size={11} />}{product.active ? (product.projectsCount > 0 || product.statusesCount > 0 ? 'Desativar' : 'Remover') : 'Reativar'}</button>
                </div>
                {expanded && <ProductStatusEditor product={product} onChanged={async () => { await load(); await onCatalogChanged?.(); }} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
