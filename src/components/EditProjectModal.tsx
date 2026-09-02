import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, X } from 'lucide-react';
import { Client, Priority, Project, ProjectStatus, User } from '../types';
import { UserAvatar } from './UserAvatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Project>, teamUserIds?: string[]) => Promise<void>;
  project: Project;
  clients: Client[];
  users: User[];
  currentUser: User;
}

export const EditProjectModal: React.FC<Props> = ({ isOpen, onClose, onSave, project, clients, users, currentUser }) => {
  const [form, setForm] = useState<Partial<Project>>({});
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentUser.role === 'ADMIN_PRINCIPAL' || currentUser.role === 'ADMIN';
  const activeUsers = users.filter(user => user.accountStatus !== 'INACTIVE');
  const managers = activeUsers.filter(user => user.role !== 'COLABORADOR');

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...project });
    setTeamIds((project.teamMemberDetails || []).filter(member => member.id !== project.managerId).map(member => member.id));
    setError(null);
  }, [isOpen, project]);

  if (!isOpen) return null;
  const manager = users.find(user => user.id === form.managerId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form, isAdmin ? teamIds : undefined);
      onClose();
    } catch (saveError: any) {
      setError(saveError.message || 'Não foi possível atualizar o projeto.');
    } finally {
      setSaving(false);
    }
  };
  const set = <K extends keyof Project>(key: K, value: Project[K]) => setForm(previous => ({ ...previous, [key]: value }));

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />
    <div className="relative w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]"><div><h2 className="text-sm font-bold text-white flex items-center gap-2"><Pencil size={15} className="text-sky-400" />Editar projeto</h2><p className="text-[11px] text-zinc-400">Alterações persistidas no PostgreSQL</p></div><button onClick={onClose} className="p-1 text-zinc-400"><X size={18} /></button></div>
      {error && <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex gap-2"><AlertCircle size={15} />{error}</div>}
      <form onSubmit={submit} className="p-5 space-y-4 text-xs overflow-y-auto">
        <label className="text-zinc-400 block">Nome<input value={form.name || ''} onChange={event => set('name', event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label>
        <label className="text-zinc-400 block">Descrição<textarea rows={3} value={form.description || ''} onChange={event => set('description', event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 resize-none" /></label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label className="text-zinc-400">Status<select value={form.status} onChange={event => set('status', event.target.value as ProjectStatus)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200"><option value="PLANEJAMENTO">Planejamento</option><option value="AGUARDANDO_INICIO">Aguardando início</option><option value="EM_ANDAMENTO">Em andamento</option><option value="AGUARDANDO_CLIENTE">Aguardando cliente</option><option value="EM_REVISAO">Em revisão</option><option value="PAUSADO">Pausado</option><option value="CONCLUIDO">Concluído</option><option value="CANCELADO">Cancelado</option></select></label><label className="text-zinc-400">Prioridade<select value={form.priority} onChange={event => set('priority', event.target.value as Priority)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200"><option value="URGENTE">Urgente</option><option value="ALTA">Alta</option><option value="NORMAL">Normal</option><option value="BAIXA">Baixa</option></select></label><label className="text-zinc-400">Progresso<input type="number" min="0" max="100" value={form.progress || 0} onChange={event => set('progress', Number(event.target.value))} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-zinc-400">Início<input type="date" value={form.startDate || ''} onChange={event => set('startDate', event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label><label className="text-zinc-400">Prazo<input type="date" value={form.dueDate || ''} onChange={event => set('dueDate', event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label></div>
        {isAdmin && <><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-zinc-400">Cliente<select value={form.clientId} onChange={event => set('clientId', event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200">{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="text-zinc-400">Gestor<div className="mt-1 flex items-center gap-2"><UserAvatar name={manager?.name || 'Gestor'} src={manager?.avatar} className="w-7 h-7" /><select value={form.managerId} onChange={event => set('managerId', event.target.value)} className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200">{managers.map(user => <option key={user.id} value={user.id}>{user.name} ({user.position})</option>)}</select></div></label></div><div><span className="text-zinc-400 block mb-1">Colaboradores</span><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{activeUsers.filter(user => user.id !== form.managerId).map(user => <button type="button" key={user.id} onClick={() => setTeamIds(previous => previous.includes(user.id) ? previous.filter(id => id !== user.id) : [...previous, user.id])} className={`flex items-center gap-2 p-2 rounded-xl border text-left ${teamIds.includes(user.id) ? 'bg-sky-500/10 border-sky-500/40' : 'bg-[#181820] border-zinc-700'}`}><UserAvatar name={user.name} src={user.avatar} className="w-6 h-6" /><span className="min-w-0"><span className="block truncate text-zinc-200">{user.name}</span><span className="block truncate text-[9px] text-zinc-500">{user.position}</span></span></button>)}</div></div></>}
        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300">Cancelar</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-bold disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar projeto'}</button></div>
      </form>
    </div>
  </div>;
};
