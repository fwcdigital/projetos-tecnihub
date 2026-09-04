import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TecnihubLogo } from './TecnihubLogo';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#09090b] text-zinc-100 p-4 relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-emerald-950/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <div className="scale-110 mb-1">
            <TecnihubLogo />
          </div>
          <p className="text-xs text-zinc-400">
            Plataforma Operacional & Gestão Estratégica da Agência
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@tecnihub.com"
                className="w-full bg-[#181820] border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Senha de Acesso
              </label>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181820] border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-zinc-800" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acessar Painel</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="mt-5 text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-500/80" />
          <span>Sessão segura com JWT e criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
};
