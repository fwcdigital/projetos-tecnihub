import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, UserCog, X } from 'lucide-react';
import { User, UserRole } from '../types';
import { UserAvatar } from './UserAvatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; password?: string; role: UserRole; job_title: string; avatar: string; status: 'ACTIVE' | 'INACTIVE' }) => Promise<void>;
  currentUser: User;
  user?: User | null;
}

export const UserManagementModal: React.FC<Props> = ({ isOpen, onClose, onSave, currentUser, user }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('COLABORADOR');
  const [jobTitle, setJobTitle] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPassword('');
    setRole(user?.role || 'COLABORADOR');
    setJobTitle(user?.position || '');
    setAvatar(user?.avatar || '');
    setStatus(user?.accountStatus || 'ACTIVE');
    setError(null);
  }, [isOpen, user]);

  if (!isOpen) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || (!user && password.length < 6)) {
      setError('Informe nome, e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), email: email.trim(), password: password || undefined, role, job_title: jobTitle.trim(), avatar: avatar.trim(), status });
      onClose();
    } catch (saveError: any) {
      setError(saveError.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />
    <div className="relative w-full max-w-lg bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]"><div><h2 className="text-sm font-bold text-white flex items-center gap-2"><UserCog size={16} className="text-purple-400" />{user ? 'Editar usuário' : 'Novo usuário'}</h2><p className="text-[11px] text-zinc-400">Conta interna — não existe cadastro público</p></div><button onClick={onClose} className="p-1 text-zinc-400"><X size={18} /></button></div>
      {error && <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex gap-2"><AlertCircle size={15} />{error}</div>}
      <form onSubmit={submit} className="p-5 space-y-4 text-xs">
        <div className="flex items-center gap-3"><UserAvatar name={name || 'Novo usuário'} src={avatar} className="w-12 h-12" /><div className="flex-1"><label className="text-zinc-400">URL do avatar/foto</label><input value={avatar} onChange={event => setAvatar(event.target.value)} placeholder="Opcional — fallback com iniciais" className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-zinc-400">Nome<input value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label><label className="text-zinc-400">E-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-zinc-400">Cargo<input value={jobTitle} onChange={event => setJobTitle(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label><label className="text-zinc-400">Perfil<select value={role} onChange={event => setRole(event.target.value as UserRole)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200">{currentUser.role === 'ADMIN_PRINCIPAL' && <option value="ADMIN_PRINCIPAL">SUPER_ADMIN</option>}<option value="ADMIN">ADMIN</option><option value="GESTOR_PROJETO">PROJECT_MANAGER</option><option value="COLABORADOR">COLLABORATOR</option></select></label></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-zinc-400">{user ? 'Nova senha (opcional)' : 'Senha inicial'}<input type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200" /></label><label className="text-zinc-400">Situação<select value={status} onChange={event => setStatus(event.target.value as 'ACTIVE' | 'INACTIVE')} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200"><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></label></div>
        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300">Cancelar</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-white text-zinc-950 font-bold disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar usuário'}</button></div>
      </form>
    </div>
  </div>;
};
