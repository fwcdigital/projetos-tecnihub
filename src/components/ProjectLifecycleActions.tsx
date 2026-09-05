import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Archive, Loader2, MoreHorizontal, Power, Trash2, X } from 'lucide-react';
import { Project } from '../types';

interface ProjectLifecycleActionsProps {
  project: Project;
  mode?: 'buttons' | 'menu';
  onSetStatus: (project: Project, status: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  onDelete: (project: Project, confirmationName: string) => Promise<void>;
}

export const ProjectLifecycleActions: React.FC<ProjectLifecycleActionsProps> = ({ project, mode = 'menu', onSetStatus, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<'ARCHIVE' | 'DELETE' | null>(null);
  const [confirmationName, setConfirmationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const inactive = project.accountStatus === 'INACTIVE';

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnViewportChange = () => setMenuOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [menuOpen]);

  const reactivate = async () => {
    setBusy(true);
    setError('');
    try {
      await onSetStatus(project, 'ACTIVE');
      setMenuOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível reativar o projeto.');
    } finally {
      setBusy(false);
    }
  };

  const openConfirmation = (kind: 'ARCHIVE' | 'DELETE') => {
    setMenuOpen(false);
    setError('');
    setConfirmationName('');
    setConfirmation(kind);
  };

  const buttons = <>
    {inactive
      ? <button type="button" disabled={busy} onClick={event => { event.stopPropagation(); void reactivate(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/60 disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}Reativar projeto</button>
      : <button type="button" onClick={event => { event.stopPropagation(); openConfirmation('ARCHIVE'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-950/50"><Archive size={13} />Arquivar projeto</button>}
    <button type="button" onClick={event => { event.stopPropagation(); openConfirmation('DELETE'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800/60 bg-rose-950/25 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/50"><Trash2 size={13} />Excluir definitivamente</button>
  </>;

  return <>
    {mode === 'buttons' ? <div className="flex flex-wrap items-center gap-2">{buttons}</div> : (
      <div ref={menuRef} className="relative" onClick={event => event.stopPropagation()}>
        <button ref={menuButtonRef} type="button" aria-label={`Ações de ${project.name}`} aria-expanded={menuOpen} onClick={() => {
          if (menuOpen) return setMenuOpen(false);
          const rect = menuButtonRef.current?.getBoundingClientRect();
          if (rect) setMenuPosition({
            top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 104)),
            left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216))
          });
          setMenuOpen(true);
        }} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><MoreHorizontal size={15} /></button>
        {menuOpen && createPortal(<div ref={popupRef} style={menuPosition} className="fixed z-[170] w-52 rounded-lg border border-zinc-700 bg-[#18181d] p-1.5 text-left shadow-2xl shadow-black/60" onClick={event => event.stopPropagation()}>
          {inactive
            ? <button type="button" disabled={busy} onClick={() => void reactivate()} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-50"><Power size={13} />Reativar projeto</button>
            : <button type="button" onClick={() => openConfirmation('ARCHIVE')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-amber-300 hover:bg-amber-950/40"><Archive size={13} />Arquivar projeto</button>}
          <button type="button" onClick={() => openConfirmation('DELETE')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/40"><Trash2 size={13} />Excluir definitivamente</button>
          {error && <p role="alert" className="px-2.5 py-1 text-[10px] text-rose-300">{error}</p>}
        </div>, document.body)}
      </div>
    )}

    {confirmation && <div className="fixed inset-0 z-[180] flex items-center justify-center p-4" onClick={event => event.stopPropagation()}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" onClick={() => !busy && setConfirmation(null)} />
      <div role="alertdialog" aria-modal="true" aria-labelledby="project-lifecycle-title" className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-[#15151a] shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
          <div className="flex gap-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${confirmation === 'DELETE' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}><AlertTriangle size={16} /></span><div><h2 id="project-lifecycle-title" className="text-sm font-bold text-zinc-100">{confirmation === 'DELETE' ? 'Excluir projeto definitivamente' : 'Arquivar projeto'}</h2><p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{confirmation === 'DELETE' ? 'Esta ação excluirá definitivamente o projeto e todos os dados relacionados, incluindo tarefas, responsáveis, comentários e histórico operacional. Esta ação não pode ser desfeita. O cliente será preservado.' : 'O projeto deixará a listagem de ativos, mas tarefas, responsáveis, comentários, recorrências e histórico serão preservados.'}</p></div></div>
          <button type="button" disabled={busy} onClick={() => setConfirmation(null)} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X size={16} /></button>
        </div>
        {confirmation === 'DELETE' && <div className="mx-4 mt-4 space-y-3 rounded-lg border border-rose-900/60 bg-rose-950/25 p-3 text-[11px] leading-relaxed text-rose-200"><p>Um snapshot técnico será preservado somente para auditoria.</p><label className="block"><span className="mb-1 block font-semibold text-rose-100">Digite <strong>{project.name}</strong> para confirmar</span><input autoFocus value={confirmationName} onChange={event => setConfirmationName(event.target.value)} className="w-full rounded-lg border border-rose-900/80 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-rose-600" placeholder={project.name} /></label></div>}
        {error && <div role="alert" className="mx-4 mt-4 rounded-lg border border-rose-800/50 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</div>}
        <div className="flex justify-end gap-2 p-4">
          <button type="button" disabled={busy} onClick={() => setConfirmation(null)} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50">Cancelar</button>
          <button type="button" disabled={busy || (confirmation === 'DELETE' && confirmationName.trim() !== project.name)} onClick={() => {
            setBusy(true); setError('');
            const action = confirmation === 'DELETE' ? onDelete(project, confirmationName.trim()) : onSetStatus(project, 'INACTIVE');
            action.then(() => { setConfirmation(null); setConfirmationName(''); }).catch(cause => setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.')).finally(() => setBusy(false));
          }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${confirmation === 'DELETE' ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'}`}>{busy && <Loader2 size={13} className="animate-spin" />}{confirmation === 'DELETE' ? 'Sim, excluir definitivamente' : 'Sim, arquivar projeto'}</button>
        </div>
      </div>
    </div>}
  </>;
};
