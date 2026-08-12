import React, { useState } from 'react';
import { Compass, Sparkles, User, Mail, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { loginWithGoogle, isFirebaseConfigured } from '../services/firebase';
import { ModalBase } from './ModalBase';

interface LoginModalProps {
  onLoginSuccess: (userData: { displayName: string; email: string; photoURL?: string }) => void;
  isOpen: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, isOpen }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setErrorMsg(null);
    try {
      const u = await loginWithGoogle();
      if (u) {
        onLoginSuccess({
          displayName: u.displayName || 'Usuario Google',
          email: u.email || '',
          photoURL: u.photoURL || undefined
        });
      }
    } catch (err: any) {
      console.error("Error al iniciar sesión con Google:", err);
      if (err?.message?.includes("Firebase no está configurado")) {
        setErrorMsg("⚠️ Google Auth (Firebase) no tiene las variables configuradas en Vercel aún. Puedes usar el formulario de abajo (Nombre y Apellidos) para entrar al instante.");
      } else {
        setErrorMsg(err.message || "No se pudo conectar con Google Auth. Puedes usar el formulario de Nombre y Apellidos.");
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMsg("Por favor, introduce tu nombre.");
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    onLoginSuccess({
      displayName: fullName,
      email: email.trim() || `${firstName.toLowerCase()}@itravelmap.com`,
      photoURL: undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-slate-800/60 backdrop-blur-lg border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl text-white overflow-y-auto max-h-[92vh] z-10 glass-modal">
        
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/logo.png" alt="iTRAVEL_MAP Logo" className="w-16 h-16 rounded-2xl object-cover animated-logo-glow mb-3 border-2 border-brand-400/50" />
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            iTRAVEL_MAP
            <span className="text-xs bg-brand-500/20 text-brand-400 font-semibold px-2 py-0.5 rounded-full border border-brand-500/30">AI Copilot</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Planifica viajes inteligentes con rutas interactivas, transportes y mapas en tiempo real
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Google SSO Button */}
        {isFirebaseConfigured() && (
          <button
            onClick={handleGoogleLogin}
            disabled={isLoadingGoogle}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 shadow-md transition-all border border-slate-200 active:scale-[0.98] disabled:opacity-50 text-sm mb-5"
          >
            {isLoadingGoogle ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-brand-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>Acceder con tu cuenta de Google</span>
          </button>
        )}

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-slate-800" />
          <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">o completa tus datos</span>
          <div className="flex-grow border-t border-slate-800" />
        </div>

        {/* Custom Registration Form */}
        <form onSubmit={handleCustomLogin} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Nombre *</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Carlos"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white placeholder-slate-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Apellidos</label>
              <input
                type="text"
                placeholder="Gómez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                placeholder="carlos@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-white placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all active:scale-[0.98] text-sm"
          >
            <span>Empezar a Planificar</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck size={14} className="text-teal-400" />
            <span>Acceso Seguro Encriptado</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <CheckCircle2 size={13} className="text-brand-400" />
            <span>Gemini 3.6 Ready</span>
          </div>
        </div>

      </div>
    </div>
  );
};
