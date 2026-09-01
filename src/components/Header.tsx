import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Bell, 
  CheckSquare, 
  FolderPlus, 
  UserPlus, 
  Building, 
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react';
import { User } from '../types';
import { UserRoleSwitcher } from './UserRoleSwitcher';
import { NavView } from './Sidebar';

interface HeaderProps {
  currentView: NavView;
  subTitle?: string;
  currentUser: User;
  onSelectUser: (user: User) => void;
  onOpenNewTask: () => void;
  onOpenNewProject: () => void;
  onOpenNewClient: () => void;
  onOpenNewUser?: () => void;
  onOpenGlobalSearch: () => void;
  overdueCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  subTitle,
  currentUser,
  onSelectUser,
  onOpenNewTask,
  onOpenNewProject,
  onOpenNewClient,
  onOpenNewUser,
  onOpenGlobalSearch,
  overdueCount
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const getViewTitle = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return 'Dashboard Geral';
      case 'MEU_TRABALHO':
        return 'Meu Trabalho';
      case 'PROJETOS':
        return 'Projetos';
      case 'PROJETO_DETALHE':
        return subTitle || 'Detalhes do Projeto';
      case 'CLIENTES':
        return 'Clientes';
      case 'CLIENTE_DETALHE':
        return subTitle || 'Visão do Cliente';
      case 'EQUIPE':
        return 'Equipe & Pessoas';
      case 'MEMBRO_DETALHE':
        return subTitle || 'Agenda do Colaborador';
      case 'RECORRENCIAS':
        return 'Serviços Recorrentes';
      case 'CALENDARIO':
        return 'Calendário de Entregas';
      case 'RELATORIOS':
        return 'Relatórios & Produtividade';
      case 'CONFIGURACOES':
        return 'Configurações do Sistema';
      case 'PERFIL':
        return 'Meu Perfil';
      default:
        return 'Central de Projetos';
    }
  };

  return (
    <header className="h-14 border-b border-[#1e1e24] bg-[#0c0c0f]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Breadcrumbs & View Title */}
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden sm:inline">
          Tecnihub
        </span>
        <ChevronRight size={14} className="text-zinc-600 hidden sm:inline" />
        <h1 className="text-sm font-bold text-zinc-100 truncate flex items-center gap-2">
          {getViewTitle()}
          {currentView === 'MEU_TRABALHO' && overdueCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
              {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
            </span>
          )}
        </h1>
      </div>

      {/* Right: Quick Search + Role Switcher + Notifications + Global + NOVO Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
        >
          <Search size={14} />
          <span className="hidden md:inline">Buscar tarefas, projetos, clientes...</span>
          <span className="hidden lg:inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-500 border border-zinc-700">
            ⌘K
          </span>
        </button>

        {/* Role Simulator Switcher */}
        <UserRoleSwitcher currentUser={currentUser} onSelectUser={onSelectUser} />

        {/* Notifications Icon with Pulse Badge */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors relative"
            title="Notificações e Alertas"
          >
            <Bell size={15} />
            {overdueCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            {overdueCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#121215] border border-zinc-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">Alertas Operacionais</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    2 novos
                  </span>
                </div>
                <div className="py-2 space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200">
                    <p className="font-semibold text-rose-300 text-[11px] uppercase tracking-wider">
                      Urgente: Tarefa Atrasada
                    </p>
                    <p className="text-zinc-300 text-xs mt-0.5">
                      "Revisar campanha Google Ads" da Clínica Horizonte venceu ontem.
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Há 2 horas • Responsável: Caio</span>
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-300">
                    <p className="font-semibold text-amber-300 text-[11px] uppercase tracking-wider">
                      Vence Hoje às 11:00
                    </p>
                    <p className="text-zinc-200 text-xs mt-0.5">
                      "Finalizar página Home" da Indústria Atlas precisa de revisão.
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Hoje às 08:30 • Responsável: Gabriel</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Global Primary Action Button: + NOVO */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 font-bold text-xs shadow-sm transition-all"
            title="Criar novo item"
          >
            <Plus size={15} className="font-black text-black" />
            <span>NOVO</span>
          </button>

          {/* New Item Dropdown Menu */}
          {isNewMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNewMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141418] border border-zinc-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Criar no Sistema
                </div>
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    onOpenNewTask();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <CheckSquare size={15} className="text-emerald-400" />
                  <div>
                    <p>Nova Tarefa</p>
                    <span className="text-[10px] text-zinc-400 font-normal">Demanda pontual ou recorrente</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    onOpenNewProject();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <FolderPlus size={15} className="text-sky-400" />
                  <div>
                    <p>Novo Projeto</p>
                    <span className="text-[10px] text-zinc-400 font-normal">Site, Landing Page, Tráfego, etc.</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    onOpenNewClient();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <Building size={15} className="text-purple-400" />
                  <div>
                    <p>Novo Cliente</p>
                    <span className="text-[10px] text-zinc-400 font-normal">Cadastrar nova empresa</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    if (onOpenNewUser) onOpenNewUser();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <UserPlus size={15} className="text-amber-400" />
                  <div>
                    <p>Novo Membro da Equipe</p>
                    <span className="text-[10px] text-zinc-400 font-normal">Adicionar colaborador</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
