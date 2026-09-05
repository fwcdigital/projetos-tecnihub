import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Loader2, Plus, Power, PowerOff, Save, Trash2 } from 'lucide-react';
import type { Priority, ProductDefinition, ProductStatusDefinition, ProductTaskTemplateItem } from '../types';
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

const ProductTaskTemplateEditor: React.FC<StatusEditorProps> = ({ product, onChanged }) => {
  const [items, setItems] = useState<ProductTaskTemplateItem[]>([]);
  const [statuses, setStatuses] = useState<ProductStatusDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { title: string; statusId: string; priority: Priority }>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newStatusId, setNewStatusId] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('NORMAL');
  const [busyId, setBusyId] = useState<string | null>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [fetchedItems, fetchedStatuses] = await Promise.all([
      productService.getTaskTemplate(product.id),
      productService.getStatuses(product.id, true)
    ]);
    setItems(fetchedItems);
    setStatuses(fetchedStatuses);
    setDrafts(Object.fromEntries(fetchedItems.map(item => [item.id, { title: item.title, statusId: item.statusId || '', priority: item.priority }])));
  }, [product.id]);

  useEffect(() => {
    setBusyId('loading');
    setError('');
    load().catch(actionError => setError(actionError.message || 'Não foi possível carregar o modelo.')).finally(() => setBusyId(null));
  }, [load]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await Promise.all([load(), onChanged()]);
    } catch (actionError: any) {
      setError(actionError.message || 'Não foi possível salvar o modelo.');
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= items.length) return;
    const ids = items.map(item => item.id);
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    void run(items[index].id, () => productService.reorderTemplateTasks(product.id, ids));
  };

  return <div className="border-t border-zinc-800 bg-zinc-950/55 px-3 py-4 sm:px-5">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Modelo de tarefas — {product.name}</h3><p className="mt-0.5 text-[10px] text-zinc-500">Aplicado somente a novos projetos quando a opção estiver marcada.</p></div><span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-400">{items.length} tarefas</span></div>
    {error && <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); const title = newTitle.trim(); if (!title) return; void run('new-template-task', async () => { await productService.createTemplateTask(product.id, { title, statusId: newStatusId || undefined, priority: newPriority }); setNewTitle(''); }); }} className="mb-4 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_minmax(170px,.65fr)_130px_auto]">
      <input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Nome da nova tarefa" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500" />
      <select value={newStatusId} onChange={event => setNewStatusId(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200 outline-none [color-scheme:dark]"><option value="">Primeiro status ativo</option>{statuses.filter(status => status.active).map(status => <option key={status.id} value={status.id}>{status.name}</option>)}</select>
      <select value={newPriority} onChange={event => setNewPriority(event.target.value as Priority)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200 outline-none [color-scheme:dark]"><option value="URGENTE">Urgente</option><option value="ALTA">Alta</option><option value="NORMAL">Normal</option><option value="BAIXA">Baixa</option></select>
      <button disabled={busyId === 'new-template-task' || !newTitle.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40">{busyId === 'new-template-task' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Adicionar tarefa</button>
    </form>
    {busyId === 'loading' ? <div className="flex items-center gap-2 py-4 text-xs text-zinc-500"><Loader2 size={14} className="animate-spin" />Carregando modelo...</div> : <div className="space-y-1.5">{items.map((item, index) => {
      const draft = drafts[item.id] || { title: item.title, statusId: item.statusId || '', priority: item.priority };
      const busy = busyId === item.id;
      return <div key={item.id} className="grid grid-cols-[20px_minmax(0,1fr)_28px_28px_32px] items-center gap-2 rounded-lg border border-zinc-800 bg-[#121216] p-2 lg:grid-cols-[20px_minmax(220px,1fr)_minmax(170px,.65fr)_130px_70px_28px_28px_32px]">
        <GripVertical size={14} className="col-start-1 row-start-1 text-zinc-600" />
        <input value={draft.title} onChange={event => setDrafts(previous => ({ ...previous, [item.id]: { ...draft, title: event.target.value } }))} className="col-span-4 col-start-2 row-start-1 min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600 lg:col-span-1" />
        <select value={draft.statusId} onChange={event => setDrafts(previous => ({ ...previous, [item.id]: { ...draft, statusId: event.target.value } }))} className="col-span-5 col-start-1 row-start-2 min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-300 outline-none [color-scheme:dark] lg:col-span-1 lg:col-start-3 lg:row-start-1"><option value="">Primeiro status ativo</option>{statuses.map(status => <option key={status.id} value={status.id}>{status.name}{status.active ? '' : ' (inativo)'}</option>)}</select>
        <select value={draft.priority} onChange={event => setDrafts(previous => ({ ...previous, [item.id]: { ...draft, priority: event.target.value as Priority } }))} className="col-span-5 col-start-1 row-start-3 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-300 outline-none [color-scheme:dark] lg:col-span-1 lg:col-start-4 lg:row-start-1"><option value="URGENTE">Urgente</option><option value="ALTA">Alta</option><option value="NORMAL">Normal</option><option value="BAIXA">Baixa</option></select>
        <button type="button" disabled={busy || !draft.title.trim()} onClick={() => void run(item.id, () => productService.updateTemplateTask(product.id, item.id, { title: draft.title.trim(), statusId: draft.statusId || null, priority: draft.priority }))} className="col-span-2 col-start-1 row-start-4 inline-flex items-center justify-center gap-1 rounded border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 lg:col-span-1 lg:col-start-5 lg:row-start-1"><Save size={11} />Salvar</button>
        <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} className="col-start-3 row-start-4 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20 lg:col-start-6 lg:row-start-1" title="Mover para cima"><ArrowUp size={13} /></button>
        <button type="button" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} className="col-start-4 row-start-4 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20 lg:col-start-7 lg:row-start-1" title="Mover para baixo"><ArrowDown size={13} /></button>
        <button type="button" disabled={busy} onClick={() => void run(item.id, () => productService.deleteTemplateTask(product.id, item.id))} className="col-start-5 row-start-4 rounded p-1.5 text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 lg:col-start-8 lg:row-start-1" title="Excluir tarefa do modelo"><Trash2 size={13} /></button>
      </div>;
    })}{items.length === 0 && <div className="rounded-lg border border-dashed border-zinc-800 p-5 text-center text-xs text-zinc-500">Este Produto ainda não possui tarefas no modelo.</div>}</div>}
  </div>;
};

export type ProductManagerSection = 'PRODUCTS' | 'STATUSES' | 'TEMPLATES';

interface ProductManagerProps {
  section: ProductManagerSection;
  onCatalogChanged?: () => Promise<void>;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ section, onCatalogChanged }) => {
  const [products, setProducts] = useState<ProductDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [busyId, setBusyId] = useState<string | null>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const fetched = await productService.getAll(true);
    setProducts(fetched);
    setDrafts(Object.fromEntries(fetched.map(product => [product.id, { name: product.name, color: product.color }])));
    setSelectedProductId(previous => fetched.some(product => product.id === previous) ? previous : fetched[0]?.id || '');
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

  const selectedProduct = products.find(product => product.id === selectedProductId);

  if (section !== 'PRODUCTS') {
    const isStatuses = section === 'STATUSES';
    return (
      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#121216]">
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="settings-product" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Produto</label>
            <select id="settings-product" value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)} className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none [color-scheme:dark] focus:border-sky-500">
              {products.map(product => <option key={product.id} value={product.id}>{product.name}{product.active ? '' : ' (inativo)'}</option>)}
            </select>
          </div>
          {selectedProduct && <span className="self-start rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-400 sm:self-auto">{isStatuses ? `${selectedProduct.statusesCount} status configurados` : `${selectedProduct.templateTasksCount || 0} tarefas configuradas`}</span>}
        </div>
        {busyId === 'loading' ? (
          <div className="flex items-center gap-2 p-5 text-xs text-zinc-500"><Loader2 size={14} className="animate-spin" />Carregando produtos...</div>
        ) : selectedProduct ? (
          isStatuses
            ? <ProductStatusEditor key={selectedProduct.id} product={selectedProduct} onChanged={async () => { await load(); await onCatalogChanged?.(); }} />
            : <ProductTaskTemplateEditor key={selectedProduct.id} product={selectedProduct} onChanged={async () => { await load(); await onCatalogChanged?.(); }} />
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500">Nenhum Produto cadastrado. Crie um Produto antes de configurar esta seção.</div>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#121216]">
      <div className="p-4">
        <h2 className="text-sm font-bold text-zinc-100">Produtos</h2>
        <p className="mt-1 text-xs text-zinc-500">Crie, organize e mantenha o catálogo de Produtos do sistema.</p>
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
            return (
              <div key={product.id} className={product.active ? '' : 'opacity-60'}>
                <div className="grid items-center gap-2 px-3 py-3 sm:grid-cols-[16px_1fr_48px_120px_76px_28px_28px_86px]">
                  <span style={{ backgroundColor: draft.color }} className="h-3 w-3 rounded-full" />
                  <input value={draft.name} onChange={event => setDrafts(previous => ({ ...previous, [product.id]: { ...draft, name: event.target.value } }))} className="min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs font-semibold text-zinc-200 outline-none focus:border-zinc-600" />
                  <input type="color" value={draft.color} onChange={event => setDrafts(previous => ({ ...previous, [product.id]: { ...draft, color: event.target.value } }))} className="h-8 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-1" title="Cor do produto" />
                  <span className="text-[10px] text-zinc-500">{product.projectsCount} projeto(s)</span>
                  <button type="button" disabled={busy} onClick={() => void run(product.id, () => productService.update(product.id, draft))} className="inline-flex items-center justify-center gap-1 rounded border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"><Save size={11} />Salvar</button>
                  <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para cima"><ArrowUp size={13} /></button>
                  <button type="button" disabled={busy || index === products.length - 1} onClick={() => move(index, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-20" title="Mover para baixo"><ArrowDown size={13} /></button>
                  <button type="button" disabled={busy} onClick={() => void run(product.id, () => product.active ? productService.remove(product.id) : productService.update(product.id, { active: true }))} className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[10px] ${product.active ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title={product.projectsCount > 0 || product.statusesCount > 0 ? 'Produto relacionado será desativado' : undefined}>{product.active ? <PowerOff size={11} /> : <Power size={11} />}{product.active ? (product.projectsCount > 0 || product.statusesCount > 0 ? 'Desativar' : 'Remover') : 'Reativar'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
