import React, { useEffect, useState } from 'react';
import { Client, Priority, Project, ProjectStatus, ProjectStatusDefinition, ProjectType, User } from '../types';
import { X, FolderPlus, Building2, User as UserIcon, Repeat, Loader2, AlertCircle } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { DateTimePicker } from './DateTimePicker';
import { isAdministrator } from '../permissions';
import { PriorityPicker } from './PriorityPicker';
import { StatusPicker } from './StatusPicker';
import { getProjectStatusOptions } from './visualTokens';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (newProjectData: Partial<Project>, teamUserIds: string[]) => Promise<void> | void;
  clients: Client[];
  users: User[];
  currentUser: User;
  defaultClientId?: string;
  projectStatuses: ProjectStatusDefinition[];
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  clients,
  users,
  currentUser,
  defaultClientId,
  projectStatuses
}) => {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || '');
  const [managerId, setManagerId] = useState(currentUser.id);
  const [type, setType] = useState<ProjectType>('SITE');
  const [status, setStatus] = useState<ProjectStatus>(projectStatuses[0]?.id || 'PLANEJAMENTO');
  const [priority, setPriority] = useState<Priority>('ALTA');
  const statusOptions = getProjectStatusOptions(projectStatuses, { value: status });
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find(c => c.id === clientId) || clients[0];
  const selectedManager = users.find(u => u.id === managerId) || currentUser;
  const activeUsers = users.filter(user => user.accountStatus !== 'INACTIVE');
  const managerOptions = activeUsers.filter(user => user.role !== 'COLABORADOR');
  const isAdmin = isAdministrator(currentUser.role);

  useEffect(() => {
    if (!isOpen) return;
    setClientId(defaultClientId || clients[0]?.id || '');
    if (currentUser.role === 'GESTOR_PROJETO') setManagerId(currentUser.id);
    if (!projectStatuses.some(option => option.id === status)) setStatus(projectStatuses[0]?.id || 'PLANEJAMENTO');
  }, [clients, currentUser.id, currentUser.role, defaultClientId, isOpen, projectStatuses, status]);

  const projectTypeOptions: { value: ProjectType; label: string }[] = [
    { value: 'SITE', label: 'Criação de Site Institucional' },
    { value: 'LANDING_PAGE', label: 'Landing Page' },
    { value: 'ECOMMERCE', label: 'Loja Virtual / E-commerce' },
    { value: 'GOOGLE_ADS', label: 'Tráfego Pago (Google Ads)' },
    { value: 'META_ADS', label: 'Mídia Paga (Meta Ads)' },
    { value: 'SEO', label: 'Otimização SEO' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media & Conteúdo' },
    { value: 'MANUTENCAO', label: 'Manutenção & Suporte Web' },
    { value: 'INTERNO', label: 'Projeto Interno da Agência' },
    { value: 'OUTRO', label: 'Outro Serviço' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedClient) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onAddProject({
        name: name.trim(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        managerId: selectedManager.id,
        managerName: selectedManager.name,
        startDate: isAdmin ? startDate : undefined,
        dueDate: isAdmin ? dueDate : undefined,
        progress: 0,
        status,
        priority,
        type,
        isRecurring,
        description: description.trim(),
        tasksCount: 0,
        overdueTasksCount: 0,
      }, selectedUserIds);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar projeto no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTeamMember = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderPlus size={16} className="text-sky-400" />
              Novo Projeto da Agência
            </h2>
            <p className="text-[11px] text-zinc-400">Cadastre um novo escopo de projeto ou serviço contínuo</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Project Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Nome do Projeto *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Novo Site Institucional ou Gestão Google Ads Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-100 text-sm focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          {/* Client and Project Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-zinc-500" />
                Cliente Vinculado *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Tipo de Serviço / Entrega
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                {projectTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Manager & Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <UserIcon size={12} className="text-zinc-500" />
                Responsável
              </label>
              <div className="flex items-center gap-2">
                <UserAvatar name={selectedManager.name} src={selectedManager.avatar} className="w-7 h-7" />
                <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                disabled={currentUser.role === 'GESTOR_PROJETO'}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                {managerOptions.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                ))}
              </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Status Inicial
              </label>
              <StatusPicker value={status} options={statusOptions} onChange={value => setStatus(value as ProjectStatus)} ariaLabel="Status inicial do projeto" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Prioridade
              </label>
              <PriorityPicker value={priority} onChange={setPriority} />
            </div>
          </div>

          {/* Dates & Recurring */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            {isAdmin ? <><DateTimePicker label="Data de início" value={startDate} onChange={setStartDate} /><DateTimePicker label="Prazo final previsto" value={dueDate} onChange={setDueDate} /></> : <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5 text-[11px] text-zinc-500">Datas estruturais são definidas por um administrador.</div>}

            <div className="p-2.5 rounded-xl bg-[#181820] border border-zinc-700 flex items-center justify-between">
              <span className="text-xs text-zinc-300 flex items-center gap-1.5">
                <Repeat size={13} className="text-purple-400" />
                Demanda Recorrente?
              </span>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-0 bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* Team Members Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Membros e Especialistas Alocados ao Projeto
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeUsers.map(u => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => toggleTeamMember(u.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-200' 
                        : 'bg-[#181820] border-zinc-700/60 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <UserAvatar name={u.name} src={u.avatar} className="w-5 h-5" />
                    <div className="truncate">
                      <p className="text-[11px] font-medium truncate">{u.name}</p>
                      <p className="text-[9px] opacity-70 truncate">{u.position}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Escopo e Objetivos do Projeto
            </label>
            <textarea
              rows={3}
              placeholder="Descreva o escopo contratado, objetivos de marketing, links de referência..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-sky-500 resize-none text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-zinc-900" />
                  <span>Criando Projeto...</span>
                </>
              ) : (
                <span>Criar Projeto</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
