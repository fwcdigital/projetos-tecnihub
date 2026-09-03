import React, { useState } from 'react';
import { Client, User } from '../types';
import { X, Building, Phone, Mail, User as UserIcon, Tag, Loader2, AlertCircle } from 'lucide-react';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (newClientData: Partial<Client>) => Promise<void> | void;
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
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [leadManagerId, setLeadManagerId] = useState(currentUser.id);
  const [services, setServices] = useState('Google Ads, Meta Ads');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedManager = users.find(u => u.id === leadManagerId) || currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const initials = name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || 'CL';

    try {
      await onAddClient({
        name: name.trim(),
        company: company.trim() || name.trim(),
        logo: initials,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        leadManagerId: selectedManager.id,
        leadManagerName: selectedManager.name,
        teamMembers: [selectedManager.name],
        statusRelationship: 'ATIVO',
        notes: notes.trim(),
        monthlyServices: services.split(',').map(s => s.trim()).filter(Boolean)
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cliente no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

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

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              E-mail de Notificação / Relatórios
            </label>
            <input
              type="email"
              placeholder="contato@empresa.com.br"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <UserIcon size={12} className="text-zinc-500" />
                Gestor da Conta (Líder)
              </label>
              <select
                value={leadManagerId}
                onChange={(e) => setLeadManagerId(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <Tag size={12} className="text-zinc-500" />
                Serviços Contratados (Tags)
              </label>
              <input
                type="text"
                placeholder="Google Ads, Meta Ads, SEO"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Observações Estratégicas do Cliente
            </label>
            <textarea
              rows={2}
              placeholder="Particularidades do nicho, metas de conversão ou acordos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-purple-500 resize-none text-xs"
            />
          </div>

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
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Cliente</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
