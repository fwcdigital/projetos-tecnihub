import React, { useState } from 'react';
import { Client, User } from '../types';
import { X, Building, Phone, Mail, User as UserIcon, Tag } from 'lucide-react';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (newClient: Client) => void;
  users: User[];
  currentUser: User;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  onAddClient,
  users,
  currentUser
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [leadManagerId, setLeadManagerId] = useState(currentUser.id);
  const [services, setServices] = useState('Google Ads, Meta Ads');
  const [notes, setNotes] = useState('');

  const selectedManager = users.find(u => u.id === leadManagerId) || currentUser;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || 'CL';

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      company: company.trim() || name.trim(),
      logo: initials,
      contactName,
      contactEmail,
      contactPhone,
      activeProjectsCount: 0,
      completedProjectsCount: 0,
      leadManagerId: selectedManager.id,
      leadManagerName: selectedManager.name,
      teamMembers: [selectedManager.name],
      statusRelationship: 'ATIVO',
      notes,
      monthlyServices: services.split(',').map(s => s.trim()).filter(Boolean),
      createdAt: '2026-09-01',
    };

    onAddClient(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building size={16} className="text-purple-400" />
              Novo Cliente / Conta da Agência
            </h2>
            <p className="text-[11px] text-zinc-400">Cadastre dados da empresa e ponto de contato</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Nome Fantasia do Cliente *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Clínica Horizonte, Imobiliária Central"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-100 text-sm focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Razão Social / Empresa
            </label>
            <input
              type="text"
              placeholder="Ex: Horizonte Medicina Integrada Ltda"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Pessoa de Contato Principal
              </label>
              <input
                type="text"
                placeholder="Ex: Dra. Roberta Santos"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                WhatsApp / Telefone
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                E-mail de Contato
              </label>
              <input
                type="email"
                placeholder="contato@cliente.com.br"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Gestor da Conta
              </label>
              <select
                value={leadManagerId}
                onChange={(e) => setLeadManagerId(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Serviços Contratados (Separados por vírgula)
            </label>
            <input
              type="text"
              placeholder="Ex: Google Ads, Meta Ads, Manutenção Web, SEO"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Observações & Instruções do Cliente
            </label>
            <textarea
              rows={2}
              placeholder="Preferências, horários para aprovação, links de drives..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 font-bold shadow-sm"
            >
              Cadastrar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
