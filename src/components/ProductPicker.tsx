import React from 'react';
import { Check } from 'lucide-react';
import { PickerPopover } from './PickerPopover';
import { ProductBadge } from './ProductBadge';

export interface ProductPickerOption {
  value: string;
  label: string;
  color?: string;
  disabled?: boolean;
}

interface ProductPickerProps {
  value: string;
  options: ProductPickerOption[];
  onChange?: (value: string) => void;
  ariaLabel?: string;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({ value, options, onChange, ariaLabel = 'Alterar tipo' }) => {
  const current = options.find(option => option.value === value) || { value, label: value, color: '#71717a' };

  if (!onChange) return <ProductBadge label={current.label} color={current.color} />;

  return <PickerPopover ariaLabel={ariaLabel} width={230} trigger={<ProductBadge label={current.label} color={current.color} interactive />}>
    {close => <>
      <div className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Tipo</div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {options.map(option => {
          const selected = option.value === value;
          return <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => {
              onChange(option.value);
              close();
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${selected ? 'bg-zinc-800' : 'hover:bg-zinc-800/70'} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <ProductBadge label={option.label} color={option.color} />
            {selected && <Check size={13} className="shrink-0 text-sky-400" />}
          </button>;
        })}
      </div>
    </>}
  </PickerPopover>;
};
