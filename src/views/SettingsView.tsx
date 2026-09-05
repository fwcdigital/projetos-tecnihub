import React from 'react';
import { ListChecks, Package, Workflow } from 'lucide-react';
import { ProductManager, ProductManagerSection } from '../components/ProductManager';

interface SettingsViewProps {
  section: ProductManagerSection;
  onSectionChange: (section: ProductManagerSection) => void;
  canManageCatalog: boolean;
  onCatalogChanged: () => Promise<void>;
}

const sections: Array<{ id: ProductManagerSection; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'PRODUCTS', label: 'Produtos', icon: Package },
  { id: 'STATUSES', label: 'Status dos Produtos', icon: Workflow },
  { id: 'TEMPLATES', label: 'Modelos de Tarefas', icon: ListChecks }
];

export const SettingsView: React.FC<SettingsViewProps> = ({ section, onSectionChange, canManageCatalog, onCatalogChanged }) => (
  <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
    <div className="border-b border-zinc-800 pb-4">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Configurações</h1>
      <p className="mt-1 text-xs text-zinc-400 sm:text-sm">Administre o catálogo e suas configurações operacionais.</p>
    </div>

    <div className="md:hidden">
      <label htmlFor="settings-section" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Catálogo</label>
      <select id="settings-section" value={section} onChange={event => onSectionChange(event.target.value as ProductManagerSection)} className="w-full rounded-lg border border-zinc-700 bg-[#121216] px-3 py-2.5 text-xs font-semibold text-zinc-100 outline-none [color-scheme:dark] focus:border-sky-500">
        {sections.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>

    <div className="grid items-start gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-4 hidden rounded-xl border border-zinc-800 bg-[#121216] p-2 md:block" aria-label="Navegação de configurações">
        <p className="px-2.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Catálogo</p>
        <nav className="space-y-1">
          {sections.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return <button key={item.id} type="button" onClick={() => onSectionChange(item.id)} aria-current={active ? 'page' : undefined} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-colors ${active ? 'border border-zinc-700 bg-zinc-800 text-white' : 'border border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}><Icon size={15} /><span>{item.label}</span></button>;
          })}
        </nav>
      </aside>

      <main className="min-w-0">
        {canManageCatalog
          ? <ProductManager section={section} onCatalogChanged={onCatalogChanged} />
          : <div className="rounded-xl border border-zinc-800 bg-[#121216] p-6 text-sm text-zinc-400">Somente administradores podem gerenciar estas configurações.</div>}
      </main>
    </div>
  </div>
);
