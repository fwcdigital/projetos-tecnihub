import React from 'react';
import { LayoutGrid, Rows3, Table2 } from 'lucide-react';

export type ViewMode = 'ROW' | 'TABLE' | 'CARD';

interface ViewModeSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  modes?: ViewMode[];
}

const viewModes = {
  ROW: ['Linha', Rows3],
  TABLE: ['Tabela', Table2],
  CARD: ['Cards', LayoutGrid]
} as const;

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({ value, onChange, modes = ['ROW', 'TABLE'] }) => (
  <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5" aria-label="Modo de visualização">
    {modes.map(mode => {
      const [label, Icon] = viewModes[mode];
      return (
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
      );
    })}
  </div>
);
