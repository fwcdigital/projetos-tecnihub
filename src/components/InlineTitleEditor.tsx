import React, { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

interface InlineTitleEditorProps {
  value: string;
  onOpen: () => void;
  onSave?: (value: string) => void | Promise<void>;
  completed?: boolean;
}

export const InlineTitleEditor: React.FC<InlineTitleEditorProps> = ({ value, onOpen, onSave, completed }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== value) void onSave?.(next);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onClick={event => event.stopPropagation()}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); commit(); }
          if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        }}
        className="min-w-0 flex-1 rounded-md border border-sky-500 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-100 outline-none"
        aria-label="Editar título da tarefa"
      />
    );
  }

  return (
    <div className="group/title flex min-w-0 flex-1 items-center gap-1">
      <button
        type="button"
        onClick={event => { event.stopPropagation(); onOpen(); }}
        className={`min-w-0 truncate text-left text-xs font-semibold text-zinc-100 hover:text-sky-200 ${completed ? 'font-normal text-zinc-400 line-through' : ''}`}
        title={value}
      >
        {value}
      </button>
      {onSave && (
        <button
          type="button"
          onClick={event => { event.stopPropagation(); setEditing(true); }}
          className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800 hover:text-zinc-200 focus:opacity-100 group-hover/title:opacity-100"
          title="Editar título"
          aria-label="Editar título"
        >
          <Pencil size={10} />
        </button>
      )}
    </div>
  );
};
