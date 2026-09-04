import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, X } from 'lucide-react';
import { Client, ProductDefinition, Project, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { DateTimePicker } from './DateTimePicker';
import { canEditProjectDates, canManageProjectOperations, isAdministrator } from '../permissions';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';
import { ProductPicker } from './ProductPicker';
import { getWorkflowStatusOptions } from './visualTokens';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Project>, teamUserIds?: string[]) => Promise<void>;
  project: Project;
  clients: Client[];
  users: User[];
  currentUser: User;
  products: ProductDefinition[];
}

export const EditProjectModal: React.FC<Props> = ({ isOpen, onClose, onSave, project, clients, users, currentUser, products }) => {
  const [form, setForm] = useState<Partial<Project>>({});
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = isAdministrator(currentUser.role);
  const canManageStructure = canManageProjectOperations(currentUser.role);
  const canChangeDates = canEditProjectDates(currentUser.role);
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
  const selectedProduct = products.find(product => product.id === form.type)
    || products.find(product => product.id === project.type)
    || ({ id: project.type, name: project.typeName || project.type, color: project.typeColor || '#71717a', position: 0, active: false, projectsCount: 1, statusesCount: project.workflowStatuses?.length || 0, statuses: project.workflowStatuses || [] });
  const productOptions = [
    ...(!products.some(product => product.id === selectedProduct.id) ? [{ value: selectedProduct.id, label: `${selectedProduct.name} (inativo)`, color: selectedProduct.color }] : []),
    ...products.filter(product => product.active || product.id === project.type).map(product => ({ value: product.id, label: `${product.name}${product.active ? '' : ' (inativo)'}`, color: product.color }))
  ];
  const statusOptions = getWorkflowStatusOptions(selectedProduct?.statuses || [], { value: form.status || project.status, label: project.statusName, color: project.statusColor });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct || !selectedProduct.statuses?.some(status => status.id === form.status)) {
      setError('Selecione um Status compatível com o Tipo do projeto.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const allowedForm = { ...form };
      if (!canChangeDates) {
        delete allowedForm.startDate;
        delete allowedForm.dueDate;
      }
      if (!isAdmin) delete allowedForm.managerId;
      await onSave(allowedForm, canManageStructure ? teamIds : undefined);
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-zinc-400">Status<span className="mt-2 block"><StatusPicker value={form.status || project.status} options={statusOptions} onChange={value => set('status', value)} ariaLabel="Status do projeto" /></span></label>
          <label className="text-zinc-400">Tipo<span className="mt-2 block"><ProductPicker value={form.type || project.type} options={productOptions} onChange={type => { const product = products.find(option => option.id === type); setForm(previous => ({ ...previous, type, status: product?.statuses?.[0]?.id || '' })); }} ariaLabel="Tipo do projeto" /></span></label>
          <label className="text-zinc-400">Prioridade<span className="mt-2 block"><PriorityPicker value={form.priority || project.priority} onChange={value => set('priority', value)} /></span></label>
        </div>
        {canChangeDates ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><DateTimePicker label="Início" value={form.startDate || ''} onChange={date => set('startDate', date)} /><DateTimePicker label="Prazo" value={form.dueDate || ''} onChange={date => set('dueDate', date)} /></div> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-zinc-500">Período estrutural: {form.startDate || 'sem início'} → {form.dueDate || 'sem prazo'} (somente administradores podem alterar)</div>}
        {canManageStructure && <><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-zinc-400">Cliente<select value={form.clientId} onChange={event => set('clientId', event.target.value)} className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#181820] p-2 text-zinc-200">{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="text-zinc-400">Responsável principal<div className="mt-1 flex items-center gap-2"><UserAvatar name={manager?.name || 'Responsável'} src={manager?.avatar} className="h-7 w-7" />{isAdmin ? <select value={form.managerId} onChange={event => set('managerId', event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-[#181820] p-2 text-zinc-200">{managers.map(user => <option key={user.id} value={user.id}>{user.name} ({user.position})</option>)}</select> : <span className="text-zinc-300">{manager?.name || project.managerName}</span>}</div></label></div><div><span className="mb-1 block text-zinc-400">Colaboradores</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{activeUsers.filter(user => user.id !== form.managerId).map(user => <button type="button" key={user.id} onClick={() => setTeamIds(previous => previous.includes(user.id) ? previous.filter(id => id !== user.id) : [...previous, user.id])} className={`flex items-center gap-2 rounded-xl border p-2 text-left ${teamIds.includes(user.id) ? 'border-sky-500/40 bg-sky-500/10' : 'border-zinc-700 bg-[#181820]'}`}><UserAvatar name={user.name} src={user.avatar} className="h-6 w-6" /><span className="min-w-0"><span className="block truncate text-zinc-200">{user.name}</span><span className="block truncate text-[9px] text-zinc-500">{user.position}</span></span></button>)}</div></div></>}
        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300">Cancelar</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-bold disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar projeto'}</button></div>
      </form>
    </div>
  </div>;
};
