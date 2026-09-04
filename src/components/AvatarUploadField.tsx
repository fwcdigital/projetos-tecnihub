import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

interface AvatarUploadFieldProps {
  name: string;
  src?: string;
  selectedFile: File | null;
  removed: boolean;
  onSelectedFile: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const AvatarUploadField: React.FC<AvatarUploadFieldProps> = ({
  name,
  src,
  selectedFile,
  removed,
  onSelectedFile,
  onRemove,
  disabled = false,
  compact = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Use uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('A imagem deve possuir no máximo 5 MB.');
      return;
    }
    setError('');
    onSelectedFile(file);
  };

  const visibleAvatar = previewUrl || (!removed ? src : '');

  return (
    <div className={`flex min-w-0 ${compact ? 'items-center gap-3' : 'flex-col items-center gap-3 sm:flex-row'}`}>
      <UserAvatar name={name || 'Usuário'} src={visibleAvatar} className={compact ? 'h-12 w-12' : 'h-20 w-20'} />
      <div className={`min-w-0 ${compact ? 'flex-1' : 'text-center sm:text-left'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"><Camera size={13} />Alterar foto</button>
          {!removed && (visibleAvatar || src) && <button type="button" disabled={disabled} onClick={() => { setError(''); onRemove(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/60 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"><Trash2 size={13} />Remover foto</button>}
        </div>
        <p className="mt-1 text-[10px] text-zinc-500">JPG, PNG ou WEBP · máximo 5 MB</p>
        {selectedFile && !removed && <p className="mt-1 truncate text-[10px] text-emerald-400">Selecionada: {selectedFile.name}</p>}
        {removed && <p className="mt-1 text-[10px] text-amber-400">O avatar padrão com iniciais será restaurado ao salvar.</p>}
        {error && <p role="alert" className="mt-1 text-[10px] text-rose-400">{error}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={chooseFile} className="hidden" disabled={disabled} />
    </div>
  );
};
