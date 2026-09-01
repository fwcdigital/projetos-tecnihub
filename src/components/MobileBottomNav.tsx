import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Building2, 
  Plus, 
  Menu
} from 'lucide-react';
import { NavView } from './Sidebar';

interface MobileBottomNavProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenNewMenu: () => void;
  onOpenMobileMenu: () => void;
  overdueCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenNewMenu,
  onOpenMobileMenu,
  overdueCount
}) => {
  const isMeuTrabalhoActive = currentView === 'MEU_TRABALHO';
  const isDashboardActive = currentView === 'DASHBOARD';
  const isProjetosActive = currentView === 'PROJETOS' || currentView === 'PROJETO_DETALHE';
  const isClientesActive = currentView === 'CLIENTES' || currentView === 'CLIENTE_DETALHE';

  return (
    <nav 
      aria-label="Navegação móvel"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c10]/95 backdrop-blur-xl border-t border-[#1e1e26] px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_20px_rgba(0,0,0,0.6)] select-none safe-area-pb"
    >
      {/* 1. Meu Trabalho */}
      <button
        onClick={() => onNavigate('MEU_TRABALHO')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors relative ${
          isMeuTrabalhoActive ? 'text-emerald-400' : 'text-zinc-400 active:text-zinc-200'
        }`}
        title="Meu Trabalho"
      >
        <div className="relative">
          <CheckSquare size={20} />
          {overdueCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 animate-pulse">
              {overdueCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Tarefas</span>
      </button>

      {/* 2. Projetos */}
      <button
        onClick={() => onNavigate('PROJETOS')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
          isProjetosActive ? 'text-emerald-400' : 'text-zinc-400 active:text-zinc-200'
        }`}
        title="Projetos"
      >
        <FolderKanban size={20} />
        <span className="text-[10px] font-semibold mt-0.5">Projetos</span>
      </button>

      {/* 3. Central Action Button: + NOVO */}
      <button
        onClick={onOpenNewMenu}
        className="flex flex-col items-center justify-center -mt-4 bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 w-12 h-12 rounded-full font-bold border-2 border-[#0c0c10]"
        title="Criar Nova Demanda"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* 4. Clientes */}
      <button
        onClick={() => onNavigate('CLIENTES')}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
          isClientesActive ? 'text-emerald-400' : 'text-zinc-400 active:text-zinc-200'
        }`}
        title="Clientes"
      >
        <Building2 size={20} />
        <span className="text-[10px] font-semibold mt-0.5">Clientes</span>
      </button>

      {/* 5. Menu Drawer */}
      <button
        onClick={onOpenMobileMenu}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-lg transition-colors ${
          isDashboardActive ? 'text-emerald-400' : 'text-zinc-400 active:text-zinc-200'
        }`}
        title="Menu Completo"
      >
        <Menu size={20} />
        <span className="text-[10px] font-semibold mt-0.5">Mais</span>
      </button>
    </nav>
  );
};
