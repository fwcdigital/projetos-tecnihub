import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, Users, X } from 'lucide-react';
import { Assignee, User } from '../types';
import { AvatarGroup } from './AvatarGroup';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { canManageTaskAssignments } from '../permissions';

interface AssigneePickerProps {
  users: Array<User | Assignee>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  selectedAssignees?: Assignee[];
  single?: boolean;
  displayMode?: 'AVATARS' | 'PERSON';
}

export const AssigneePicker: React.FC<AssigneePickerProps> = ({ users, selectedIds, onChange, disabled, label = 'Responsáveis', required = true, selectedAssignees = [], single = false, displayMode = 'AVATARS' }) => {
  const { user } = useAuth();
  const canEdit = !disabled && Boolean(user && canManageTaskAssignments(user.role));
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const activeUsers = users.filter(user => !('accountStatus' in user) || user.accountStatus !== 'INACTIVE');
  const assignees: Assignee[] = selectedIds
    .map(id => activeUsers.find(user => user.id === id) || selectedAssignees.find(user => user.id === id))
    .filter((user): user is User | Assignee => Boolean(user))
    .map(user => ({ id: user.id, name: user.name, avatar: user.avatar, position: user.position || ('roleTitle' in user ? user.roleTitle : '') }));
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return activeUsers.filter(user => !term || `${user.name} ${'email' in user ? user.email : ''} ${user.position}`.toLowerCase().includes(term));
  }, [activeUsers, search]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = (id: string) => {
    if (single) {
      onChange([id]);
      setIsOpen(false);
      return;
    }
    const validSelectedIds = selectedIds.filter(selectedId => activeUsers.some(user => user.id === selectedId));
    if (selectedIds.includes(id)) {
      if (required && validSelectedIds.length === 1) return;
      onChange(validSelectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...validSelectedIds, id]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className={`flex items-center gap-3 ${label ? 'justify-between' : 'justify-end'}`}>
        {label && <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>}
        {displayMode === 'PERSON' ? <button type="button" onClick={event => { event.stopPropagation(); if (canEdit) setIsOpen(previous => !previous); }} className={`inline-flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[10px] text-zinc-400 ${canEdit ? 'hover:bg-zinc-800 hover:text-zinc-100' : ''}`} title={assignees.map(assignee => assignee.name).join(', ') || 'Sem responsável'}>{assignees[0] && <UserAvatar name={assignees[0].name} src={assignees[0].avatar} className="h-5 w-5" />}<span className="truncate">{assignees.map(assignee => assignee.name).join(', ') || 'Sem responsável'}</span></button> : <AvatarGroup assignees={assignees} editable={canEdit} size="md" onClick={() => canEdit && setIsOpen(previous => !previous)} />}
      </div>
      {isOpen && (
        <div className="absolute right-0 z-[70] mt-2 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-700 bg-[#18181b] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
            <Search size={14} className="text-zinc-500" />
            <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." className="min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-500" />
            <button type="button" onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-200"><X size={14} /></button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500"><Users size={11} />Equipe do projeto</div>
            {filteredUsers.map(user => {
              const selected = selectedIds.includes(user.id);
              return (
                <button key={user.id} type="button" onClick={() => toggle(user.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${selected ? 'bg-sky-500/10' : 'hover:bg-zinc-800'}`}>
                  <UserAvatar name={user.name} src={user.avatar} className="h-7 w-7" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-zinc-200">{user.name}</span><span className="block truncate text-[10px] text-zinc-500">{user.position || ('roleTitle' in user ? user.roleTitle : '')}</span></span>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-sky-400 bg-sky-500 text-white' : 'border-zinc-600'}`}>{selected && <Check size={10} strokeWidth={3} />}</span>
                </button>
              );
            })}
            {filteredUsers.length === 0 && <p className="px-2 py-6 text-center text-xs text-zinc-500">Nenhuma pessoa encontrada.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
