import React, { useState } from 'react';
import { Client, Project, Task, User } from '../types';
import { 
  Building2, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  User as UserIcon, 
  FolderKanban, 
  ArrowRight,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  onSelectClient: (client: Client) => void;
  onOpenNewClient?: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  projects,
  tasks,
  onSelectClient,
  onOpenNewClient
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
      c.company.toLowerCase().includes(term) ||
      c.contactName.toLowerCase().includes(term);
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Clientes & Contas da Agência
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
              {filteredClients.length} cadastrados
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão das empresas atendidas, contatos diretos e serviços contratados.
          </p>
        </div>

        {onOpenNewClient && (
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>+ Novo Cliente</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-[#121216] border border-zinc-800 flex items-center text-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome da empresa, contato ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#181820] border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const clientProjects = projects.filter(p => p.clientId === client.id);
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const pendingTasks = clientTasks.filter(t => t.status !== 'CONCLUIDO').length;

          return (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="p-4 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] flex flex-col justify-between space-y-4 group"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-300 flex items-center justify-center font-bold text-xs">
                      {client.logo}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                        {client.name}
                      </h2>
                      <p className="text-[11px] text-zinc-400">{client.company}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                    Ativo
                  </span>
                </div>

                {/* Contact quick details */}
                <div className="space-y-1 text-xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <UserIcon size={12} className="text-zinc-500" />
                    <span>{client.contactName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={12} className="text-zinc-500" />
                    <span>{client.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone size={12} className="text-zinc-500" />
                    <span>{client.contactPhone}</span>
                  </div>
                </div>

                {/* Monthly Services Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {client.monthlyServices.map((serv, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px] font-medium border border-zinc-700/50"
                    >
                      {serv}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Metrics */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-300">
                    {clientProjects.length} {clientProjects.length === 1 ? 'projeto' : 'projetos'}
                  </span>
                  <span>•</span>
                  <span>{pendingTasks} demandas abertas</span>
                </div>

                <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
