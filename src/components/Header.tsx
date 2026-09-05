import React, { useEffect, useRef, useState } from 'react';
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
import { OperationalViewMode, User, Notification } from '../types';
import { UserRoleSwitcher } from './UserRoleSwitcher';
import { NavView } from './Sidebar';
import { isAdministrator } from '../permissions';
import { NotificationItem } from './NotificationItem';

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
  unreadNotificationsCount: number;
  onMarkAllNotificationsRead?: () => Promise<void> | void;
  onMarkNotificationRead?: (notification: Notification) => void;
  onOpenNotification?: (notification: Notification) => void;
  onOpenNotificationCenter?: () => void;
  onOpenProfile: () => void;
  onNotificationsOpen?: () => void;
  operationalView: OperationalViewMode;
  onOperationalViewChange: (mode: OperationalViewMode) => void;
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
  unreadNotificationsCount,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onOpenNotification,
  onOpenNotificationCenter,
  onOpenProfile,
  onNotificationsOpen,
  operationalView,
  onOperationalViewChange
}) => {
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | 'new' | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const isNewMenuOpen = openMenu === 'new';
  const isNotificationsOpen = openMenu === 'notifications';

  useEffect(() => {
    if (!openMenu) return;
    const closeOnOutside = (event: PointerEvent) => {
      const activeRef = openMenu === 'notifications' ? notificationMenuRef : openMenu === 'profile' ? profileMenuRef : newMenuRef;
      if (!activeRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu]);

  useEffect(() => setOpenMenu(null), [currentView]);

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
      case 'NOTIFICACOES':
        return 'Notificações';
      case 'CONFIGURACOES':
        return 'Configurações';
      case 'PERFIL':
        return 'Meu Perfil';
      default:
        return 'Central de Projetos';
    }
  };

  const unreadCount = unreadNotificationsCount;

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
        {isAdministrator(currentUser.role) && (
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5" role="group" aria-label="Modo operacional do sistema">
            {(['admin', 'operator'] as OperationalViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => onOperationalViewChange(mode)}
                aria-pressed={operationalView === mode}
                className={`rounded-md px-1.5 py-1.5 text-[10px] font-semibold transition-colors sm:px-2.5 sm:text-[11px] ${operationalView === mode ? 'bg-emerald-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
              >
                Modo {mode === 'admin' ? 'Admin' : 'Operador'}
              </button>
            ))}
          </div>
        )}
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
        <div ref={profileMenuRef} className="hidden sm:block">
          <UserRoleSwitcher currentUser={currentUser} isOpen={openMenu === 'profile'} onOpenChange={open => setOpenMenu(open ? 'profile' : null)} onOpenProfile={onOpenProfile} />
        </div>

        {/* Notifications Icon with Badge */}
        <div ref={notificationMenuRef} className="relative">
          <button
            onClick={() => {
              const opening = !isNotificationsOpen;
              setOpenMenu(opening ? 'notifications' : null);
              if (opening) onNotificationsOpen?.();
            }}
            className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors relative min-w-[38px] min-h-[38px] flex items-center justify-center"
            title="Notificações e Alertas"
            aria-label="Abrir notificações"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
              <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-800 bg-[#121215] p-3 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-200">Notificações</span>
                  {onMarkAllNotificationsRead && unreadCount > 0 && (
                    <button 
                      onClick={() => void onMarkAllNotificationsRead()}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto py-2">
                  {notifications.slice(0, 8).map(notification => <NotificationItem key={notification.id} notification={notification} compact onClick={() => { setOpenMenu(null); onOpenNotification?.(notification); }} onMarkRead={() => onMarkNotificationRead?.(notification)} />)}
                  {notifications.length === 0 && <div className="px-3 py-8 text-center text-xs text-zinc-500">Nenhuma notificação por enquanto.</div>}
                </div>
                {onOpenNotificationCenter && <button type="button" onClick={() => { setOpenMenu(null); onOpenNotificationCenter(); }} className="w-full border-t border-zinc-800 pt-2 text-center text-[11px] font-semibold text-sky-400 hover:text-sky-300">Ver todas as notificações</button>}
              </div>
          )}
        </div>

        {/* Global Primary Action Button: + NOVO */}
        <div ref={newMenuRef} className="relative">
          <button
            onClick={() => setOpenMenu(isNewMenuOpen ? null : 'new')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-sm transition-all min-h-[38px]"
            title="Criar novo item"
          >
            <Plus size={16} className="font-black" strokeWidth={2.5} />
            <span className="hidden xs:inline sm:inline">NOVO</span>
          </button>

          {/* New Item Dropdown Menu */}
          {isNewMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141418] border border-zinc-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Criar no Sistema
                </div>
                <button
                  onClick={() => {
                    setOpenMenu(null);
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
                      setOpenMenu(null);
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
                      setOpenMenu(null);
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
                      setOpenMenu(null);
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
          )}
        </div>
      </div>
    </header>
  );
};
