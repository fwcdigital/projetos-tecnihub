import React from 'react';
import { AlertTriangle, Clock, Clock3, Lock, MessageSquare } from 'lucide-react';

export type AlertType = 'ATRASADO' | 'VENCE_HOJE' | 'VENCE_AMANHA' | 'AGUARDANDO_CLIENTE' | 'TAREFA_BLOQUEADA';

interface AlertBadgeProps {
  type: AlertType;
  customText?: string;
  size?: 'xs' | 'sm';
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({ type, customText, size = 'xs' }) => {
  const getConfig = () => {
    switch (type) {
      case 'ATRASADO':
        return {
          label: customText || 'Atrasada',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          icon: AlertTriangle,
          pulse: true,
        };
      case 'VENCE_HOJE':
        return {
          label: customText || 'Vence Hoje',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          icon: Clock,
          pulse: false,
        };
      case 'VENCE_AMANHA':
        return {
          label: customText || 'Vence Amanhã',
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
          icon: Clock3,
          pulse: false,
        };
      case 'AGUARDANDO_CLIENTE':
        return {
          label: customText || 'Aguardando Cliente',
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          icon: MessageSquare,
          pulse: false,
        };
      case 'TAREFA_BLOQUEADA':
        return {
          label: customText || 'Bloqueada',
          bg: 'bg-red-500/15 border-red-500/35 text-red-300',
          icon: Lock,
          pulse: false,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-medium uppercase tracking-wider ${config.bg} ${size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
      <Icon size={size === 'xs' ? 10 : 12} className={config.pulse ? 'animate-pulse' : ''} />
      <span>{config.label}</span>
    </span>
  );
};
