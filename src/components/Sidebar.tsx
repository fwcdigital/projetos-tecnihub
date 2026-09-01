import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Building2, 
  Users, 
  CalendarDays, 
  Repeat, 
  BarChart3, 
  Settings, 
  User as UserIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { TecnihubLogo } from './TecnihubLogo';
import { User } from '../types';

export type NavView = 
  | 'DASHBOARD'
  | 'MEU_TRABALHO'
  | 'PROJETOS'
  | 'PROJETO_DETALHE'
  | 'CLIENTES'
  | 'CLIENTE_DETALHE'
  | 'EQUIPE'
  | 'MEMBRO_DETALHE'
  | 'RECORRENCIAS'
  | 'CALENDARIO'
  | 'RELATORIOS'
  | 'CONFIGURACOES'
  | 'PERFIL';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: User;
  overdueCount: number;
  todayCount: number;
  projectsCount: number;
  clientsCount: number;
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
  clientsCount
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
      label: 'Meu Trabalho',
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
      id: 'RECORRENCIAS' as NavView,
      label: 'Recorrências',
      icon: Repeat,
      badge: (
        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
          Fixos
        </span>
      ),
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

  return (
    <aside 
      className={`relative flex flex-col justify-between h-screen bg-[#0d0d10] border-r border-[#1e1e24] transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="flex items-center justify-between px-3.5 py-4 border-b border-[#1e1e24]/80">
          <div 
            onClick={() => onNavigate('DASHBOARD')}
            className="cursor-pointer overflow-hidden transition-opacity hover:opacity-90"
          >
            <TecnihubLogo collapsed={collapsed} size="sm" />
          </div>
          
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors hidden md:block"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Main Navigation List */}
        <nav className="p-2 space-y-1">
          <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 ${collapsed ? 'hidden' : 'block'}`}>
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
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full" />
                )}
                
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
                
                {!collapsed && (
                  <div className="flex items-center justify-between w-full overflow-hidden">
                    <span className="truncate">{item.label}</span>
                    {item.badge}
                  </div>
                )}

                {/* Floating tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded shadow-lg border border-zinc-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-2 border-t border-[#1e1e24]/80 space-y-1">
        {!collapsed && (
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Sistema
          </div>
        )}

        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded shadow-lg border border-zinc-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}

        {/* User Card */}
        <div className={`mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between ${collapsed ? 'px-1' : 'px-2'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-zinc-700 flex-shrink-0"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0d0d10]" />
            </div>

            {!collapsed && (
              <div className="flex flex-col truncate text-left">
                <span className="text-xs font-semibold text-zinc-200 truncate">{currentUser.name}</span>
                <span className="text-[10px] text-zinc-500 truncate">{currentUser.position}</span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => onNavigate('DASHBOARD')}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Encerrar sessão"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
