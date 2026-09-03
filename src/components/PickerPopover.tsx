import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PickerPopoverProps {
  trigger: React.ReactNode;
  ariaLabel: string;
  children: (close: () => void) => React.ReactNode;
  width?: number;
  align?: 'start' | 'end';
}

export const PickerPopover: React.FC<PickerPopoverProps> = ({ trigger, ariaLabel, children, width = 210, align = 'start' }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return;
    const panelHeight = panelRef.current?.offsetHeight || 0;
    const desiredLeft = align === 'end' ? triggerRect.right - width : triggerRect.left;
    const left = Math.min(Math.max(8, desiredLeft), Math.max(8, window.innerWidth - width - 8));
    const below = triggerRect.bottom + 6;
    const top = panelHeight && below + panelHeight > window.innerHeight - 8 && triggerRect.top - panelHeight - 6 >= 8
      ? triggerRect.top - panelHeight - 6
      : below;
    setPosition({ left, top });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [open]);

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={event => {
        event.stopPropagation();
        if (!open) place();
        setOpen(previous => !previous);
      }}
      className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
    >
      {trigger}
    </button>
    {open && createPortal(
      <div
        ref={panelRef}
        role="listbox"
        onClick={event => event.stopPropagation()}
        style={{ left: position.left, top: position.top, width }}
        className="fixed z-[140] overflow-hidden rounded-xl border border-zinc-700 bg-[#171719] p-1.5 shadow-2xl shadow-black/60"
      >
        {children(() => setOpen(false))}
      </div>,
      document.body
    )}
  </>;
};
