import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '../types';
import { NotificationItem } from '../components/NotificationItem';

type Filter = 'ALL' | 'UNREAD' | 'MENTIONS';

function dayGroup(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startToday - startDate) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export const NotificationsView: React.FC<{
  notifications: Notification[];
  onRefresh: () => Promise<void>;
  onOpen: (notification: Notification) => void;
  onMarkRead: (notification: Notification) => void;
  onMarkAllRead: () => Promise<void>;
}> = ({ notifications, onRefresh, onOpen, onMarkRead, onMarkAllRead }) => {
  const [filter, setFilter] = useState<Filter>('ALL');
  useEffect(() => { void onRefresh(); }, [onRefresh]);
  const filtered = notifications.filter(item => filter === 'ALL' || (filter === 'UNREAD' ? !item.read : item.type === 'MENTION'));
  const grouped = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    for (const item of filtered) groups.set(dayGroup(item.createdAt), [...(groups.get(dayGroup(item.createdAt)) || []), item]);
    return [...groups.entries()];
  }, [filtered]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl"><Bell size={20} className="text-sky-400" />Notificações</h1><p className="mt-1 text-xs text-zinc-400">Menções e comentários relacionados ao seu trabalho.</p></div>
        {notifications.some(item => !item.read) && <button type="button" onClick={() => void onMarkAllRead()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"><CheckCheck size={14} />Marcar todas como lidas</button>}
      </div>
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-[#111115] p-1" role="tablist">
        {([['ALL', 'Todas'], ['UNREAD', 'Não lidas'], ['MENTIONS', 'Menções']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === id ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>{label}</button>)}
      </div>
      {grouped.map(([label, items]) => <section key={label} className="space-y-2"><h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</h2>{items.map(item => <NotificationItem key={item.id} notification={item} onClick={() => onOpen(item)} onMarkRead={() => onMarkRead(item)} />)}</section>)}
      {filtered.length === 0 && <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-12 text-center text-xs text-zinc-500">Nenhuma notificação encontrada neste filtro.</div>}
    </div>
  );
};
