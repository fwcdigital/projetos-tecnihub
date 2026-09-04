import React from 'react';

interface ProductBadgeProps {
  label: string;
  color?: string;
  interactive?: boolean;
}

export const ProductBadge: React.FC<ProductBadgeProps> = ({ label, color = '#71717a', interactive = false }) => (
  <span
    style={{ color, borderColor: `${color}66`, backgroundColor: `${color}18` }}
    className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium transition-[filter] ${interactive ? 'cursor-pointer hover:brightness-125' : ''}`}
  >
    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
    <span className="truncate">{label}</span>
  </span>
);
