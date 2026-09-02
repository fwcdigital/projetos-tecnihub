import React from 'react';

interface UserAvatarProps {
  name: string;
  src?: string;
  className?: string;
  title?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, className = 'w-7 h-7', title }) => {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  if (src) {
    return <img src={src} alt={name} title={title || name} className={`${className} rounded-full object-cover border border-zinc-700`} />;
  }
  return (
    <span
      title={title || name}
      aria-label={name}
      className={`${className} rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200 inline-flex items-center justify-center font-bold text-[10px] shrink-0`}
    >
      {initials}
    </span>
  );
};
