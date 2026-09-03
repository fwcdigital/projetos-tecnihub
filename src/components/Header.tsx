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
  Menu,
  X
} from 'lucide-react';
import { User, Notification } from '../types';
import { UserRoleSwitcher } from './UserRoleSwitcher';
import { NavView } from './Sidebar';

interface HeaderProps {
  currentView: NavView;
  subTitle?: string;
  currentUser: User;
  users?: User[];
  onSelectUser: (user: User) => void;
  onOpenNewTask: () => void;
  onOpenNewProject?: () => void;
  onOpenNewClient?: () => void;
  onOpenNewUser?: () => void;
  onOpenGlobalSearch: () => void;
  overdueCount: number;
  onOpenMobileMenu?: () => void;
  notifications?: Notification[];
  onMarkAllNotificationsRead?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  subTitle,
  currentUser,
  users = [],
  onSelectUser,
  onOpenNewTask,
  onOpenNewProject,
  onOpenNewClient,
  onOpenNewUser,
  onOpenGlobalSearch,
  overdueCount,
  onOpenMobileMenu,
  notifications = [],
  onMarkAllNotificationsRead
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const getViewTitle = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return 'Dashboard';
      case 'MEU_TRABALHO':
        return 'Tarefas';
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
        return 'Rotinas';
      case 'CALENDARIO':
        return 'Calendário';
      case 'RELATORIOS':
        return 'Relatórios';
      case 'CONFIGURACOES':
        return 'Configurações';
      case 'PERFIL':
        return 'Meu Perfil';
      default:
        return 'Central de Projetos';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length || (overdueCount > 0 ? 1 : 0);

  return (
    <header className="h-14 border-b border-[#1e1e24] bg-[#0c0c0f]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Menu Trigger + Breadcrumbs & View Title */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-hidden">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 md:hidden transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Abrir menu de navegação"
        >
          <Menu size={20} />
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden lg:inline">
          Tecnihub
        </span>
        <ChevronRight size={14} className="text-zinc-600 hidden lg:inline" />
        
        <h1 className="text-sm sm:text-base font-bold text-zinc-100 truncate flex items-center gap-1.5 sm:gap-2">
          <span>{getViewTitle()}</span>
          {currentView === 'MEU_TRABALHO' && overdueCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium whitespace-nowrap">
              {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
            </span>
          )}
        </h1>
      </div>

      {/* Right Actions: Search + Switcher + Notifications + + NOVO */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Global Search Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 justify-center"
          title="Buscar tarefas, projetos, clientes (⌘K)"
        >
          <Search size={15} />
          <span className="hidden md:inline">Buscar...</span>
          <span className="hidden xl:inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-500 border border-zinc-700">
            ⌘K
          </span>
        </button>

        {/* Role Switcher (Hidden or Compact on small screens) */}
        <div className="hidden sm:block">
          <UserRoleSwitcher currentUser={currentUser} onSelectUser={onSelectUser} availableUsers={users} />
        </div>

        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors relative min-w-[38px] min-h-[38px] flex items-center justify-center"
            title="Notificações e Alertas"
            aria-label="Abrir notificações"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-[#121215] border border-zinc-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">Alertas Operacionais</span>
                  {onMarkAllNotificationsRead && (
                    <button 
                      onClick={() => {
                        onMarkAllNotificationsRead();
                        setIsNotificationsOpen(false);
                      }}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Marcar lidas
                    </button>
                  )}
                </div>
                <div className="py-2 space-y-2 text-xs max-h-72 overflow-y-auto">
                  {overdueCount > 0 && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200">
                      <p className="font-semibold text-rose-300 text-[11px] uppercase tracking-wider">
                        Urgente: Tarefa Atrasada
                      </p>
                      <p className="text-zinc-300 text-xs mt-0.5">
                        Existem {overdueCount} tarefas com prazo vencido que exigem atenção.
                      </p>
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-300">
                    <p className="font-semibold text-amber-300 text-[11px] uppercase tracking-wider">
                      Vence Hoje às 11:00
                    </p>
                    <p className="text-zinc-200 text-xs mt-0.5">
                      "Finalizar página Home" da Indústria Atlas precisa de revisão.
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Hoje • Responsável: Gabriel</span>
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-sm transition-all min-h-[38px]"
            title="Criar novo item"
          >
            <Plus size={16} className="font-black" strokeWidth={2.5} />
            <span className="hidden xs:inline sm:inline">NOVO</span>
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
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left min-h-[44px]"
                >
                  <CheckSquare size={16} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p>Nova Tarefa</p>
                    <span className="text-[10px] text-zinc-400 font-normal">Demanda ou atividade</span>
                  </div>
                </button>

                {onOpenNewProject && (
                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onOpenNewProject();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left min-h-[44px]"
                  >
                    <FolderPlus size={16} className="text-sky-400 flex-shrink-0" />
                    <div>
                      <p>Novo Projeto</p>
                      <span className="text-[10px] text-zinc-400 font-normal">Site, Landing Page, etc.</span>
                    </div>
                  </button>
                )}

                {onOpenNewClient && (
                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onOpenNewClient();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left min-h-[44px]"
                  >
                    <Building size={16} className="text-purple-400 flex-shrink-0" />
                    <div>
                      <p>Novo Cliente</p>
                      <span className="text-[10px] text-zinc-400 font-normal">Cadastrar nova empresa</span>
                    </div>
                  </button>
                )}

                {onOpenNewUser && (
                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onOpenNewUser();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors text-left min-h-[44px]"
                  >
                    <UserPlus size={16} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <p>Novo Membro</p>
                      <span className="text-[10px] text-zinc-400 font-normal">Adicionar colaborador</span>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
