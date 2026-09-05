import React, { useEffect, useState } from 'react';
import { Client, ProductDefinition, User } from '../types';
import { X, Building, Phone, Mail, User as UserIcon, Tag, Loader2, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { ProductBadge } from './ProductBadge';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient?: (newClientData: Partial<Client>) => Promise<void> | void;
  client?: Client;
  onUpdateClient?: (client: Client, updates: Partial<Client>) => Promise<void> | void;
  users: User[];
  currentUser: User;
  products: ProductDefinition[];
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  onAddClient,
  client,
  onUpdateClient,
  users,
  currentUser,
  products
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [leadManagerId, setLeadManagerId] = useState(currentUser.id);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(client);

  useEffect(() => {
    if (!isOpen) return;
    setName(client?.name || '');
    setCompany(client?.company || '');
    setContactName(client?.contactName || '');
    setContactEmail(client?.contactEmail || '');
    setContactPhone(client?.contactPhone || '');
    setLeadManagerId(client?.leadManagerId || currentUser.id);
    setSelectedProductIds(client?.products?.map(product => product.id) || []);
    setServicesOpen(false);
    setNotes(client?.notes || '');
    setError(null);
  }, [client, currentUser.id, isOpen]);

  const managerOptions = users.filter(user => user.role !== 'COLABORADOR' && (user.accountStatus !== 'INACTIVE' || user.id === client?.leadManagerId));
  const selectedManager = managerOptions.find(user => user.id === leadManagerId);
  const unavailableCurrentManager = Boolean(client?.leadManagerId && !selectedManager);
  const availableProducts = [...products, ...(client?.products || [])]
    .filter((product, index, all) => all.findIndex(candidate => candidate.id === product.id) === index)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'));
  const selectedProducts = selectedProductIds
    .map(id => availableProducts.find(product => product.id === id))
    .filter((product): product is typeof availableProducts[number] => Boolean(product));

  const toggleProduct = (product: typeof availableProducts[number]) => {
    const selected = selectedProductIds.includes(product.id);
    if (!product.active && !selected) return;
    setSelectedProductIds(current => selected ? current.filter(id => id !== product.id) : [...current, product.id]);
  };

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
      const payload: Partial<Client> = {
        name: name.trim(),
        company: company.trim() || name.trim(),
        logo: initials,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        leadManagerId: selectedManager?.id,
        leadManagerName: selectedManager?.name || client?.leadManagerName || currentUser.name,
        teamMembers: selectedManager ? [selectedManager.name] : (client?.teamMembers || []),
        statusRelationship: 'ATIVO',
        notes: notes.trim(),
        products: selectedProducts
      };
      if (client && onUpdateClient) await onUpdateClient(client, payload);
      else if (onAddClient) await onAddClient(payload);
      else throw new Error('Ação de salvamento do cliente não configurada.');
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

      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#121216] shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building size={16} className="text-purple-400" />
              {editing ? 'Editar cliente' : 'Novo Cliente / Conta da Agência'}
            </h2>
            <p className="text-[11px] text-zinc-400">{editing ? 'Atualize os dados da empresa e do ponto de contato' : 'Cadastre dados da empresa e ponto de contato'}</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto p-5 text-xs">
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
                {unavailableCurrentManager && (
                  <option value={leadManagerId}>{client?.leadManagerName || 'Gestor atual'} (inativo)</option>
                )}
                {managerOptions.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <Tag size={12} className="text-zinc-500" />
                Serviços contratados
              </label>
              <button
                type="button"
                aria-expanded={servicesOpen}
                onClick={() => setServicesOpen(open => !open)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-[#181820] px-2.5 py-2 text-left text-zinc-300 outline-none hover:border-zinc-600 focus:border-purple-500"
              >
                <span>{selectedProductIds.length ? `${selectedProductIds.length} Produto${selectedProductIds.length === 1 ? '' : 's'}` : 'Selecionar Produtos'}</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {selectedProducts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedProducts.map(product => (
                    <span key={product.id} className="inline-flex items-center gap-1">
                      <ProductBadge label={`${product.name}${product.active ? '' : ' · inativo'}`} color={product.color} />
                      <button type="button" onClick={() => toggleProduct(product)} aria-label={`Remover ${product.name}`} className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
              {servicesOpen && (
                <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-zinc-700 bg-[#101014] p-1 shadow-xl">
                  {availableProducts.filter(product => product.active || selectedProductIds.includes(product.id)).map(product => {
                    const selected = selectedProductIds.includes(product.id);
                    return (
                      <button key={product.id} type="button" onClick={() => toggleProduct(product)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-800">
                        <ProductBadge label={`${product.name}${product.active ? '' : ' · inativo'}`} color={product.color} />
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-purple-500 bg-purple-500 text-white' : 'border-zinc-600'}`}>{selected && <Check size={11} />}</span>
                      </button>
                    );
                  })}
                  {availableProducts.length === 0 && <p className="px-2 py-3 text-center text-[11px] text-zinc-500">Nenhum Produto ativo cadastrado.</p>}
                </div>
              )}
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
                <span>{editing ? 'Salvar alterações' : 'Salvar Cliente'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
