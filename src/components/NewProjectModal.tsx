import React, { useState } from 'react';
import { Client, Priority, Project, ProjectStatus, ProjectType, User } from '../types';
import { X, FolderPlus, Building2, User as UserIcon, Calendar, Repeat } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (newProject: Project) => void;
  clients: Client[];
  users: User[];
  currentUser: User;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  clients,
  users,
  currentUser
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [managerId, setManagerId] = useState(currentUser.id);
  const [type, setType] = useState<ProjectType>('SITE');
  const [status, setStatus] = useState<ProjectStatus>('PLANEJAMENTO');
  const [priority, setPriority] = useState<Priority>('ALTA');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [dueDate, setDueDate] = useState('2026-10-30');
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([currentUser.name]);

  const selectedClient = clients.find(c => c.id === clientId) || clients[0];
  const selectedManager = users.find(u => u.id === managerId) || currentUser;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      managerId: selectedManager.id,
      managerName: selectedManager.name,
      teamMembers: selectedTeam,
      startDate,
      dueDate,
      progress: 0,
      status,
      priority,
      type,
      isRecurring,
      description,
      tasksCount: 0,
      overdueTasksCount: 0,
    };

    onAddProject(newProj);
    onClose();
  };

  const toggleTeamMember = (userName: string) => {
    if (selectedTeam.includes(userName)) {
      setSelectedTeam(selectedTeam.filter(t => t !== userName));
    } else {
      setSelectedTeam([...selectedTeam, userName]);
    }
  };

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
                Tipo de Projeto / Serviço *
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

          {/* Manager & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <UserIcon size={12} className="text-zinc-500" />
                Gestor Responsável *
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.roleTitle})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Status Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-sky-500"
              >
                <option value="PLANEJAMENTO">Planejamento</option>
                <option value="AGUARDANDO_INICIO">Aguardando Início</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
                <option value="EM_REVISAO">Em Revisão</option>
                <option value="PAUSADO">Pausado</option>
              </select>
            </div>
          </div>

          {/* Team member selection */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Equipe Envolvida
            </label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => {
                const isSelected = selectedTeam.includes(u.name);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleTeamMember(u.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                      isSelected 
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' 
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover" />
                    <span>{u.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates & Recurring toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar size={11} /> Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#141419] border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar size={11} /> Previsão de Conclusão / Renovação
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#141419] border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs"
              />
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-zinc-800 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-500 bg-zinc-800 border-zinc-700"
                />
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                  <Repeat size={12} className="text-sky-400" />
                  Projeto Recorrente (Retainer Mensal / Gestão Contínua)
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Escopo e Objetivos do Projeto
            </label>
            <textarea
              rows={2}
              placeholder="Descreva as principais entregas, metas de conversão e tecnologias..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#15151a] flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 font-bold shadow-sm"
          >
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
};
