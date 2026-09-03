import React from 'react';
import { Rows3, Table2 } from 'lucide-react';

export type ViewMode = 'ROW' | 'TABLE';

interface ViewModeSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({ value, onChange }) => (
  <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5" aria-label="Modo de visualização">
    {([
      ['ROW', 'Linha', Rows3],
      ['TABLE', 'Tabela', Table2]
    ] as const).map(([mode, label, Icon]) => (
      <button
        key={mode}
        type="button"
        onClick={() => onChange(mode)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${value === mode ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}
        aria-pressed={value === mode}
        title={`Visualização em ${label.toLowerCase()}`}
      >
        <Icon size={12} />
        <span>{label}</span>
      </button>
    ))}
  </div>
);
