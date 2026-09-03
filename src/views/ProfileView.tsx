import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Bell, Key, Check, Loader2, AlertCircle } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onChangePassword }) => {
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState('(11) 98765-4321');
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || newPassword.length < 6) {
        setSaveError('Informe a senha atual e uma nova senha com pelo menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveError('A confirmação da nova senha não confere.');
        return;
      }
    }

    setSaving(true);
    try {
      if (newPassword) {
        await onChangePassword(currentPassword, newPassword);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error: any) {
      setSaveError(error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-3 border-b border-zinc-800">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Meu Perfil & Preferências
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configurações pessoais, notificações e credenciais de acesso da conta.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Card Info */}
        <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 flex flex-col sm:flex-row items-center gap-5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700 shadow-lg"
          />
          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-bold text-white">{name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                {currentUser.roleTitle}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{email}</p>
            <p className="text-[11px] text-zinc-500">{currentUser.position} • Tecnihub Digital</p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold border border-zinc-700"
          >
            Alterar Foto
          </button>
        </div>

        {/* Personal Details */}
        <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <UserIcon size={16} className="text-emerald-400" />
            Dados Pessoais
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                disabled
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-400 text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">E-mail Profissional</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-400 text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">WhatsApp / Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Cargo / Especialidade</label>
              <input
                type="text"
                disabled
                value={`${currentUser.roleTitle} (${currentUser.position})`}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-400 text-xs cursor-not-allowed"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500">Nome, e-mail, cargo e perfil de acesso são administrados na área de Equipe.</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Key size={16} className="text-sky-400" />
            Segurança da conta
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-[11px] font-semibold text-zinc-400">Senha atual<input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500" /></label>
            <label className="text-[11px] font-semibold text-zinc-400">Nova senha<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500" /></label>
            <label className="text-[11px] font-semibold text-zinc-400">Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1 w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-500" /></label>
          </div>
          {saveError && <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300"><AlertCircle size={14} />{saveError}</div>}
        </div>

        {/* Notifications */}
        <div className="p-5 rounded-2xl bg-[#121216] border border-zinc-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            Notificações & Alertas de Prazos
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
              <div>
                <span className="font-semibold text-zinc-200 block">Alertas de Tarefas Atrasadas</span>
                <span className="text-[11px] text-zinc-400">Receba aviso imediato quando uma demanda ultrapassar o prazo</span>
              </div>
              <input
                type="checkbox"
                checked={notifySlack}
                onChange={(e) => setNotifySlack(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-800 border-zinc-700 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
              <div>
                <span className="font-semibold text-zinc-200 block">Resumo Diário Matinal (08:30)</span>
                <span className="text-[11px] text-zinc-400">E-mail com lista de todas as entregas do dia</span>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-800 border-zinc-700 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 cursor-pointer">
              <div>
                <span className="font-semibold text-zinc-200 block">Menções e Comentários</span>
                <span className="text-[11px] text-zinc-400">Notificação ao ser marcado em uma tarefa de cliente</span>
              </div>
              <input
                type="checkbox"
                checked={notifyBrowser}
                onChange={(e) => setNotifyBrowser(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-800 border-zinc-700 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <Check size={14} /> Preferências salvas com sucesso!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};
