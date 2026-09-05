import React from 'react';
import { AtSign, Check, Circle, MessageSquare } from 'lucide-react';
import type { Notification } from '../types';
import { UserAvatar } from './UserAvatar';

export function formatNotificationTime(value: string): string {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export const NotificationItem: React.FC<{ notification: Notification; onClick: () => void; onMarkRead: () => void; compact?: boolean }> = ({ notification, onClick, onMarkRead, compact }) => {
  const isMention = notification.type === 'MENTION';
  return (
    <div className="relative">
      <button type="button" onClick={onClick} className={`w-full cursor-pointer rounded-lg border p-2.5 pr-10 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${notification.read ? 'border-zinc-800 bg-zinc-900/35 hover:bg-zinc-800/60' : isMention ? 'border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/15' : 'border-zinc-700 bg-zinc-800/65 hover:bg-zinc-800'}`}>
        <span className="flex gap-2.5">
        <span className="relative shrink-0">
          <UserAvatar name={notification.actorName || 'Sistema'} src={notification.actorAvatar} className={compact ? 'h-7 w-7' : 'h-8 w-8'} />
          <span className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#121215] ${isMention ? 'bg-sky-500 text-zinc-950' : 'bg-zinc-700 text-zinc-200'}`}>
            {isMention ? <AtSign size={10} /> : <MessageSquare size={9} />}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className={`text-[11px] font-bold ${isMention ? 'text-sky-300' : 'text-zinc-200'}`}>{notification.title}</span>
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-300">{notification.message}</span>
          {notification.projectName && <span className="mt-1 block truncate text-[10px] text-zinc-500">{notification.projectName}</span>}
          <span className="mt-1 block text-[10px] text-zinc-500">{formatNotificationTime(notification.createdAt)}</span>
        </span>
        </span>
      </button>
      {notification.read ? (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-emerald-400" title="Notificação lida" aria-label="Notificação lida"><Check size={14} /></span>
      ) : (
        <button type="button" onClick={event => { event.stopPropagation(); onMarkRead(); }} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 text-zinc-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400" title="Marcar como lida" aria-label="Marcar como lida"><Circle size={12} /></button>
      )}
    </div>
  );
};
