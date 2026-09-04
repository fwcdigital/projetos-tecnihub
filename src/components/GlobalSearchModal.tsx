import React, { useState, useEffect } from 'react';
import { Task, Project, Client, User } from '../types';
import { Search, X, CheckSquare, FolderKanban, Building2, User as UserIcon, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  users: User[];
  onSelectTask: (task: Task) => void;
  onSelectProject: (project: Project) => void;
  onSelectClient: (client: Client) => void;
  onSelectUser: (user: User) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  clients,
  users,
  onSelectTask,
  onSelectProject,
  onSelectClient,
  onSelectUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const term = searchTerm.toLowerCase().trim();

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(term) ||
    t.clientName.toLowerCase().includes(term) ||
    t.projectName.toLowerCase().includes(term) ||
    t.assigneeName.toLowerCase().includes(term)
  ).slice(0, 5);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.clientName.toLowerCase().includes(term) ||
    p.managerName.toLowerCase().includes(term)
  ).slice(0, 4);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(term) ||
    c.company.toLowerCase().includes(term)
  ).slice(0, 3);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(term) ||
    u.position.toLowerCase().includes(term)
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800 bg-[#15151a]">
          <Search size={18} className="text-zinc-400" />
          <input
            type="text"
            autoFocus
            placeholder="Pesquisar por tarefas, projetos, clientes ou equipe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none font-medium"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 text-xs">
          {/* Tasks Section */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 mb-1.5">
                <CheckSquare size={12} className="text-emerald-400" />
                Tarefas ({filteredTasks.length})
              </div>
              <div className="space-y-1">
                {filteredTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTask(t);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 cursor-pointer border border-transparent hover:border-zinc-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <PriorityBadge priority={t.priority} size="sm" />
                      <span className="font-medium text-zinc-200 truncate">{t.title}</span>
                      <span className="text-[10px] text-zinc-500 truncate hidden sm:inline">
                        • {t.clientName} ({t.projectName})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={t.status} label={t.statusName} color={t.statusColor} size="sm" />
                      <ArrowRight size={12} className="text-zinc-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 mb-1.5">
                <FolderKanban size={12} className="text-sky-400" />
                Projetos ({filteredProjects.length})
              </div>
              <div className="space-y-1">
                {filteredProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 cursor-pointer border border-transparent hover:border-zinc-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{p.name}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">({p.clientName})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>{p.progress}%</span>
                      <PriorityBadge priority={p.priority} size="sm" />
                      <StatusBadge status={p.status} label={p.statusName} color={p.statusColor} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clients Section */}
          {filteredClients.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 mb-1.5">
                <Building2 size={12} className="text-purple-400" />
                Clientes ({filteredClients.length})
              </div>
              <div className="space-y-1">
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectClient(c);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 cursor-pointer border border-transparent hover:border-zinc-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-purple-950/60 text-purple-300 flex items-center justify-center font-bold text-[10px] border border-purple-800/40">
                        {c.logo}
                      </span>
                      <span className="font-semibold text-zinc-200">{c.name}</span>
                      <span className="text-[10px] text-zinc-500">{c.company}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{c.activeProjectsCount} projetos ativos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Section */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 mb-1.5">
                <UserIcon size={12} className="text-amber-400" />
                Equipe ({filteredUsers.length})
              </div>
              <div className="space-y-1">
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 cursor-pointer border border-transparent hover:border-zinc-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar name={u.name} src={u.avatar} className="h-5 w-5" />
                      <span className="font-semibold text-zinc-200">{u.name}</span>
                      <span className="text-[10px] text-zinc-500">{u.position}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{tasks.filter(task => task.participantIds.includes(u.id)).length} tarefas ativas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 && filteredProjects.length === 0 && filteredClients.length === 0 && (
            <div className="py-8 text-center text-zinc-500">
              <p>Nenhum resultado encontrado para "{searchTerm}"</p>
              <span className="text-[10px] text-zinc-600">Tente buscar por nome de cliente, responsável ou projeto.</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Keyboard Shortcuts Help */}
        <div className="p-2.5 border-t border-zinc-800 bg-[#15151a] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>Pressione <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400">ESC</kbd> para fechar</span>
            <span>Navegue com clique direto</span>
          </div>
          <span className="text-zinc-600 font-mono">Tecnihub Core Search</span>
        </div>
      </div>
    </div>
  );
};
