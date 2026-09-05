import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Bell,
  Building2, 
  Users, 
  CalendarDays, 
  BarChart3, 
  Settings, 
  User as UserIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-react';
import { TecnihubLogo } from './TecnihubLogo';
import { User, NavView } from '../types';
import { UserAvatar } from './UserAvatar';
export type { NavView } from '../types';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: User;
  overdueCount: number;
  todayCount: number;
  projectsCount: number;
  unreadNotificationsCount: number;
  clientsCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenNewTask?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  currentUser,
  overdueCount,
  todayCount,
  projectsCount,
  unreadNotificationsCount,
  clientsCount,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const mainNavItems = [
    {
      id: 'DASHBOARD' as NavView,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'MEU_TRABALHO' as NavView,
      label: 'Tarefas',
      icon: CheckSquare,
      badge: overdueCount > 0 ? (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          {overdueCount}
        </span>
      ) : todayCount > 0 ? (
        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium">
          {todayCount}
        </span>
      ) : null,
    },
    {
      id: 'PROJETOS' as NavView,
      label: 'Projetos',
      icon: FolderKanban,
      badge: (
        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
          {projectsCount}
        </span>
      ),
    },
    {
      id: 'NOTIFICACOES' as NavView,
      label: 'Notificações',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? (
        <span className="min-w-5 rounded-full border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.5 text-center text-[10px] font-bold text-sky-300">
          {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
        </span>
      ) : null,
    },
    {
      id: 'CLIENTES' as NavView,
      label: 'Clientes',
      icon: Building2,
      badge: (
        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
          {clientsCount}
        </span>
      ),
    },
    {
      id: 'EQUIPE' as NavView,
      label: 'Equipe',
      icon: Users,
      badge: null,
    },
    {
      id: 'CALENDARIO' as NavView,
      label: 'Calendário',
      icon: CalendarDays,
      badge: null,
    },
    {
      id: 'RELATORIOS' as NavView,
      label: 'Relatórios',
      icon: BarChart3,
      badge: null,
    },
  ];

  const bottomNavItems = [
    {
      id: 'CONFIGURACOES' as NavView,
      label: 'Configurações',
      icon: Settings,
    },
    {
      id: 'PERFIL' as NavView,
      label: 'Perfil',
      icon: UserIcon,
    },
  ];

  const handleItemClick = (view: NavView) => {
    onNavigate(view);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 md:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside 
        className={`
          flex flex-col justify-between h-screen bg-[#0d0d10] border-r border-[#1e1e24] transition-all duration-200 select-none
          /* Mobile Drawer Mode */
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform md:relative md:translate-x-0
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          /* Desktop Width Mode */
          ${collapsed ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* Top Brand Header */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3.5 py-4 border-b border-[#1e1e24]/80">
            <button
              type="button"
              onClick={() => handleItemClick('DASHBOARD')}
              className="overflow-hidden transition-opacity hover:opacity-90 min-h-[36px] flex items-center text-left"
              aria-label="Ir para o Dashboard"
            >
              <TecnihubLogo collapsed={collapsed} size="sm" />
            </button>
            
            {/* Desktop Collapse Button */}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors hidden md:block"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobile Close (X) Button */}
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 md:hidden transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Fechar menu lateral"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Navigation List */}
          <nav className="p-2 space-y-1">
            <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 ${collapsed ? 'hidden md:hidden' : 'block'}`}>
              Principal
            </div>

            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || 
                (item.id === 'PROJETOS' && currentView === 'PROJETO_DETALHE') ||
                (item.id === 'CLIENTES' && currentView === 'CLIENTE_DETALHE') ||
                (item.id === 'EQUIPE' && currentView === 'MEMBRO_DETALHE');

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg text-xs font-medium transition-all group relative min-h-[44px] md:min-h-[36px] ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 active:bg-zinc-800/60'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />
                  )}
                  
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  />
                  
                  {/* Text label visible when not collapsed on desktop OR always visible on mobile */}
                  <div className={`flex items-center justify-between w-full overflow-hidden ${collapsed ? 'md:hidden' : 'flex'}`}>
                    <span className="truncate text-sm md:text-xs font-medium">{item.label}</span>
                    {item.badge}
                  </div>

                  {/* Floating tooltip when collapsed on desktop */}
                  {collapsed && (
                    <div className="hidden md:block absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded shadow-lg border border-zinc-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-2 border-t border-[#1e1e24]/80 space-y-1 bg-[#0d0d10]">
          <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 ${collapsed ? 'hidden md:hidden' : 'block'}`}>
            Sistema
          </div>

          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-lg text-xs font-medium transition-all group relative min-h-[44px] md:min-h-[36px] ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 active:bg-zinc-800/60'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                <span className={`text-sm md:text-xs ${collapsed ? 'md:hidden' : 'inline'}`}>{item.label}</span>
                {collapsed && (
                  <div className="hidden md:block absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded shadow-lg border border-zinc-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          {/* User Card */}
          <div className={`mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between ${collapsed ? 'md:px-1' : 'px-2'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative flex-shrink-0">
                <UserAvatar name={currentUser.name} src={currentUser.avatar} className="h-8 w-8 md:h-7 md:w-7" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0d0d10]" />
              </div>

              <div className={`flex flex-col truncate text-left ${collapsed ? 'md:hidden' : 'flex'}`}>
                <span className="text-xs font-semibold text-zinc-200 truncate">{currentUser.name}</span>
                <span className="text-[10px] text-zinc-500 truncate">{currentUser.position}</span>
              </div>
            </div>

            <button
              onClick={() => handleItemClick('DASHBOARD')}
              className={`p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ${collapsed ? 'md:hidden' : 'block'}`}
              title="Encerrar sessão"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
