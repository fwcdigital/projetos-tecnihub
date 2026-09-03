import React from 'react';
import { Plus } from 'lucide-react';
import { Assignee } from '../types';
import { UserAvatar } from './UserAvatar';

interface AvatarGroupProps {
  assignees: Assignee[];
  max?: number;
  editable?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignees, max = 3, editable, onClick, size = 'sm' }) => {
  const visible = assignees.slice(0, max);
  const remaining = Math.max(0, assignees.length - visible.length);
  const avatarClass = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <button
      type="button"
      onClick={event => { event.stopPropagation(); onClick?.(event); }}
      className="group/avatars inline-flex items-center -space-x-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      title={assignees.map(assignee => `${assignee.name} — ${assignee.position}`).join('\n') || 'Sem responsáveis'}
    >
      {visible.map(assignee => (
        <UserAvatar
          key={assignee.id}
          name={assignee.name}
          src={assignee.avatar}
          className={`${avatarClass} border-2 border-[#121216] group-hover/avatars:border-zinc-700`}
          title={`${assignee.name} — ${assignee.position}`}
        />
      ))}
      {remaining > 0 && (
        <span className={`${avatarClass} rounded-full border-2 border-[#121216] bg-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center`}>
          +{remaining}
        </span>
      )}
      {editable && (
        <span className={`${avatarClass} rounded-full border border-dashed border-zinc-600 bg-zinc-900 text-zinc-500 group-hover/avatars:text-zinc-200 group-hover/avatars:border-zinc-500 flex items-center justify-center`}>
          <Plus size={size === 'md' ? 14 : 11} />
        </span>
      )}
    </button>
  );
};
