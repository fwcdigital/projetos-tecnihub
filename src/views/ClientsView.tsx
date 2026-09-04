import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, Mail, Plus, Search, User as UserIcon } from 'lucide-react';
import { Client, Project, Task } from '../types';
import { ViewMode, ViewModeSwitcher } from '../components/ViewModeSwitcher';
import { StatusBadge } from '../components/StatusBadge';
import { isProjectCompleted } from '../components/visualTokens';

interface ClientsViewProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  onSelectClient: (client: Client) => void;
  onOpenNewClient?: () => void;
}

const statusLabels: Record<Client['statusRelationship'], string> = {
  ATIVO: 'Ativo', ONBOARDING: 'Onboarding', EM_RENOVACAO: 'Em renovação', PAUSADO: 'Pausado'
};

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, projects, tasks, onSelectClient, onOpenNewClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem('tecnihub:clients-view');
    return savedMode === 'TABLE' || savedMode === 'CARD' ? savedMode : 'ROW';
  });
  useEffect(() => localStorage.setItem('tecnihub:clients-view', viewMode), [viewMode]);

  const filteredClients = clients.filter(client => {
    const accountStatus = client.accountStatus || 'ACTIVE';
    if (statusFilter !== 'ALL' && accountStatus !== statusFilter) return false;
    const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
    return !term || `${client.name} ${client.company} ${client.contactName} ${client.leadManagerName}`.toLocaleLowerCase('pt-BR').includes(term);
  });
  const activeProjects = (client: Client) => projects.filter(project => project.clientId === client.id && !isProjectCompleted(project)).length;
  const openTasks = (client: Client) => tasks.filter(task => task.clientId === client.id && !task.statusCompleted).length;
  const statusBadge = (client: Client) => {
    const inactive = client.accountStatus === 'INACTIVE';
    return <StatusBadge status={inactive ? 'PAUSADO' : client.statusRelationship} label={inactive ? 'Inativo' : statusLabels[client.statusRelationship]} size="sm" />;
  };

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Clientes</h1><span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs font-bold text-zinc-300">{filteredClients.length}</span></div><p className="mt-1 text-xs text-zinc-400">Contatos, responsáveis e projetos ativos em uma visão compacta.</p></div><div className="flex items-center gap-2"><ViewModeSwitcher value={viewMode} onChange={setViewMode} modes={['ROW', 'TABLE', 'CARD']} />{onOpenNewClient && <button type="button" onClick={onOpenNewClient} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-100"><Plus size={13} />Novo cliente</button>}</div></div>

      <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-[#121216] p-2.5 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar cliente, empresa, contato ou responsável" className="w-full rounded-lg border border-zinc-700 bg-[#181820] py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500" /></div><div className="inline-flex self-start rounded-lg border border-zinc-700 bg-zinc-900 p-0.5" aria-label="Filtrar clientes por situação">{([{ value: 'ACTIVE', label: 'Ativos' }, { value: 'INACTIVE', label: 'Inativos' }, { value: 'ALL', label: 'Todos' }] as const).map(option => <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} aria-pressed={statusFilter === option.value} className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${statusFilter === option.value ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{option.label}</button>)}</div></div>

      {viewMode === 'ROW' ? (
        <div className="space-y-1.5">{filteredClients.map(client => (
          <article key={client.id} role="button" tabIndex={0} onClick={() => onSelectClient(client)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelectClient(client); }} className={`grid cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-[#121216] px-3 py-2 transition-colors hover:border-zinc-700 hover:bg-[#16161c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 md:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_minmax(150px,.8fr)_90px_90px_100px_32px] ${client.accountStatus === 'INACTIVE' ? 'opacity-70' : ''}`}>
            <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-800/40 bg-purple-950/60 text-[10px] font-bold text-purple-300">{client.logo}</span><span className="min-w-0"><button type="button" onClick={event => { event.stopPropagation(); onSelectClient(client); }} className="block max-w-full truncate text-left text-xs font-bold text-zinc-100 hover:text-sky-300">{client.name}</button><span className="block truncate text-[10px] text-zinc-500">{client.company}</span></span></div>
            <div className="min-w-0 text-[10px] text-zinc-500"><span className="flex items-center gap-1 truncate text-zinc-300"><UserIcon size={10} />{client.contactName}</span><span className="mt-0.5 flex items-center gap-1 truncate"><Mail size={10} />{client.contactEmail}</span></div>
            <span className="flex min-w-0 items-center gap-1 truncate text-[10px] text-zinc-400"><UserIcon size={10} className="text-zinc-600" />{client.leadManagerName || 'Sem responsável'}</span>
            <span className="text-[10px] text-zinc-400"><strong className="text-zinc-200">{activeProjects(client)}</strong> ativos</span>
            <span className="text-[10px] text-zinc-500"><strong className="text-zinc-300">{openTasks(client)}</strong> tarefas</span>
            {statusBadge(client)}
            <button type="button" onClick={event => { event.stopPropagation(); onSelectClient(client); }} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200" title="Abrir cliente"><ArrowRight size={13} /></button>
          </article>
        ))}</div>
      ) : viewMode === 'TABLE' ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#111115]"><table className="w-full min-w-[780px] border-collapse text-left"><thead><tr className="border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-600"><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Contato</th><th className="px-3 py-2">Responsável</th><th className="px-3 py-2">Projetos ativos</th><th className="px-3 py-2">Tarefas abertas</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-zinc-800">{filteredClients.map(client => (
          <tr key={client.id} tabIndex={0} onClick={() => onSelectClient(client)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelectClient(client); }} className={`cursor-pointer text-[11px] text-zinc-400 hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/60 ${client.accountStatus === 'INACTIVE' ? 'opacity-70' : ''}`}><td className="px-3 py-2"><button type="button" onClick={event => { event.stopPropagation(); onSelectClient(client); }} className="flex max-w-52 items-center gap-1.5 truncate font-bold text-zinc-100 hover:text-sky-300"><Building2 size={11} />{client.name}</button><span className="block truncate text-[9px] text-zinc-600">{client.company}</span></td><td className="px-3 py-2"><span className="block text-zinc-300">{client.contactName}</span><span className="block text-[9px] text-zinc-600">{client.contactEmail}</span></td><td className="px-3 py-2">{client.leadManagerName || '—'}</td><td className="px-3 py-2 font-mono">{activeProjects(client)}</td><td className="px-3 py-2 font-mono">{openTasks(client)}</td><td className="px-3 py-2">{statusBadge(client)}</td></tr>
        ))}</tbody></table></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filteredClients.map(client => (
          <article key={client.id} role="button" tabIndex={0} onClick={() => onSelectClient(client)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelectClient(client); }} className={`group flex min-h-48 cursor-pointer flex-col rounded-xl border border-zinc-800 bg-[#121216] p-4 transition-colors hover:border-zinc-700 hover:bg-[#16161c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${client.accountStatus === 'INACTIVE' ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-800/40 bg-purple-950/60 text-xs font-bold text-purple-300">{client.logo}</span><span className="min-w-0"><button type="button" onClick={event => { event.stopPropagation(); onSelectClient(client); }} className="block max-w-full truncate text-left text-sm font-bold text-zinc-100 hover:text-sky-300">{client.name}</button><span className="block truncate text-[10px] text-zinc-500">{client.company}</span></span></div>{statusBadge(client)}</div>
            <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-zinc-300"><UserIcon size={12} className="shrink-0 text-zinc-600" /><span className="truncate">{client.contactName}</span></span><span className="flex min-w-0 items-center gap-2 text-zinc-500"><Mail size={12} className="shrink-0 text-zinc-600" /><span className="truncate">{client.contactEmail}</span></span><span className="flex min-w-0 items-center gap-2 text-zinc-400"><UserIcon size={12} className="shrink-0 text-zinc-600" /><span className="truncate">{client.leadManagerName || 'Sem responsável'}</span></span></div>
            <div className="mt-auto flex items-end justify-between gap-3 pt-4"><div className="flex gap-4 text-[10px] text-zinc-500"><span><strong className="block font-mono text-sm text-zinc-200">{activeProjects(client)}</strong>projetos ativos</span><span><strong className="block font-mono text-sm text-zinc-200">{openTasks(client)}</strong>tarefas abertas</span></div><button type="button" onClick={event => { event.stopPropagation(); onSelectClient(client); }} className="rounded-lg border border-zinc-700 p-2 text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100" title="Abrir cliente"><ArrowRight size={14} /></button></div>
          </article>
        ))}</div>
      )}
      {filteredClients.length === 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-10 text-center text-xs text-zinc-500">Nenhum cliente encontrado.</div>}
    </div>
  );
};
