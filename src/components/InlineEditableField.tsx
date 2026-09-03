import React, { useEffect, useState } from 'react';

interface InlineEditableFieldProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export const InlineEditableField: React.FC<InlineEditableFieldProps> = ({ value, onSave, className, inputClassName, placeholder }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== value) void onSave(next);
    else setDraft(value);
  };

  if (editing) {
    return <input autoFocus value={draft} placeholder={placeholder} onClick={event => event.stopPropagation()} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') commit(); if (event.key === 'Escape') { setDraft(value); setEditing(false); } }} className={inputClassName || 'w-full rounded-md border border-sky-500 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none'} />;
  }
  return <button type="button" onClick={event => { event.stopPropagation(); setEditing(true); }} className={className || 'text-left'}>{value || placeholder}</button>;
};
