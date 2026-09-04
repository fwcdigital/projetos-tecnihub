import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, UserCheck, Briefcase, ChevronDown, LogOut } from 'lucide-react';

interface UserRoleSwitcherProps {
  currentUser: User;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN_PRINCIPAL':
        return <ShieldAlert size={13} className="text-amber-400" />;
      case 'ADMIN':
        return <Shield size={13} className="text-emerald-400" />;
      case 'GESTOR_PROJETO':
        return <Briefcase size={13} className="text-sky-400" />;
      case 'COLABORADOR':
        return <UserCheck size={13} className="text-purple-400" />;
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN_PRINCIPAL':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/40';
      case 'ADMIN':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      case 'GESTOR_PROJETO':
        return 'bg-sky-950/40 text-sky-300 border-sky-800/40';
      case 'COLABORADOR':
        return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-xs text-left"
        title="Gerenciar sessão"
      >
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-6 h-6 rounded-full object-cover border border-zinc-700 flex-shrink-0"
        />
        <div className="flex flex-col hidden sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-100 text-xs">{currentUser.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium flex items-center gap-1 ${getRoleBadgeStyle(currentUser.role)}`}>
              {getRoleIcon(currentUser.role)}
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>
        </div>
        <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-[#121215] border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1.5 mb-1 border-b border-zinc-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Sessão atual
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg bg-zinc-800/70 p-2">
              <img src={currentUser.avatar} alt={currentUser.name} className="h-7 w-7 shrink-0 rounded-full border border-zinc-700 object-cover" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-zinc-100">{currentUser.name}</span>
                <span className="block truncate text-[10px] text-zinc-400">{currentUser.email}</span>
              </div>
            </div>

            {/* Logout Action */}
            <div className="pt-2 mt-2 border-t border-zinc-800/80">
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition-colors"
              >
                <LogOut size={14} />
                <span>Encerrar Sessão (Sair)</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
