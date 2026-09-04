import React, { RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerPopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width: number;
  popoverId: string;
  align?: 'start' | 'end';
  className?: string;
  zIndex?: number;
}

const VIEWPORT_GAP = 8;
const ANCHOR_GAP = 6;

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  anchorRef,
  children,
  width,
  popoverId,
  align = 'start',
  className = '',
  zIndex = 200
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ left: 0, top: 0, width, maxHeight: 0, ready: false });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const resolvedWidth = Math.min(width, Math.max(0, viewportWidth - VIEWPORT_GAP * 2));
    const anchorRect = anchor.getBoundingClientRect();
    const panelHeight = panel.scrollHeight;
    const availableBelow = viewportHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_GAP;
    const availableAbove = anchorRect.top - ANCHOR_GAP - VIEWPORT_GAP;
    const placeBelow = availableBelow >= Math.min(panelHeight, viewportHeight - VIEWPORT_GAP * 2) || availableBelow >= availableAbove;
    const availableHeight = Math.max(0, placeBelow ? availableBelow : availableAbove);
    const maxHeight = Math.max(0, Math.min(panelHeight, availableHeight, viewportHeight - VIEWPORT_GAP * 2));
    const preferredLeft = align === 'end' ? anchorRect.right - resolvedWidth : anchorRect.left;
    const left = Math.min(Math.max(VIEWPORT_GAP, preferredLeft), viewportWidth - resolvedWidth - VIEWPORT_GAP);
    const top = placeBelow
      ? Math.max(VIEWPORT_GAP, Math.min(anchorRect.bottom + ANCHOR_GAP, viewportHeight - maxHeight - VIEWPORT_GAP))
      : Math.max(VIEWPORT_GAP, anchorRect.top - ANCHOR_GAP - maxHeight);

    setLayout({ left, top, width: resolvedWidth, maxHeight, ready: true });
  }, [align, anchorRef, width]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updatePosition);
    const observer = new ResizeObserver(updatePosition);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  return createPortal(
    <div
      ref={panelRef}
      data-date-picker-popover={popoverId}
      className={`fixed overflow-x-hidden overflow-y-auto ${className}`}
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        maxHeight: layout.maxHeight || undefined,
        visibility: layout.ready ? 'visible' : 'hidden',
        zIndex
      }}
    >
      {children}
    </div>,
    document.body
  );
};
