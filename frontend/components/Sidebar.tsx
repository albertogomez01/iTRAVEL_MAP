import React, { useState } from 'react';
import { Settings, Moon, Sun, Wallet, Activity, Image as ImageIcon, Loader2, Calendar, Banknote, MapPin } from 'lucide-react';
import { UserPreferences } from '../types';
import { generateAppLogo } from '../services/aiService';

import { User } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../services/firebase';
import { getApiKey, setCustomApiKey } from '../services/aiService';

interface SidebarProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ preferences, setPreferences, user }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(getApiKey());

  const handleGenerateLogo = async () => {
    setIsGeneratingLogo(true);
    const url = await generateAppLogo();
    if (url) {
      setLogoUrl(url);
    } else {
      alert("No se pudo generar el logo. Verifica tu conexión o API Key.");
    }
    setIsGeneratingLogo(false);
  };

  const handleSaveApiKey = () => {
    setCustomApiKey(customKeyInput.trim());
    setShowKeyModal(false);
    alert("API Key de Gemini guardada correctamente.");
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* App Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="iTRAVEL_MAP Logo" className="w-8 h-8 rounded-lg object-cover shadow-md" />
          ) : (
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-md">
              <Settings size={18} className="text-white" />
            </div>
          )}
          <h1 className="font-bold tracking-wide">iTRAVEL_MAP</h1>
        </div>
        
        <div className="flex items-center gap-1">
          {!logoUrl && (
            <button 
              onClick={handleGenerateLogo} 
              disabled={isGeneratingLogo}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="Generar Logo con IA (Gemini 3.1 Flash Image)"
            >
              {isGeneratingLogo ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            </button>
          )}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Configurar API Key de Gemini"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Profile & Google Auth Section */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-9 h-9 rounded-full border border-brand-500 shadow-sm shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {user.displayName ? user.displayName[0] : 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Usuario Google'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => logoutUser()}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md text-xs transition-colors shrink-0 ml-2"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        ) : (
          <button
            onClick={async () => {
              try {
                await loginWithGoogle();
              } catch (e: any) {
                alert(e.message || "Error al iniciar sesión con Google");
              }
            }}
            className="w-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all border border-slate-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Entrar con Google
          </button>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Preferencias de Viaje</h2>
        
        {/* Origen del Viaje */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-red-400" />
            <span className="text-sm font-medium">Localidad de Origen</span>
          </div>
          <input
            type="text"
            placeholder="Ej. Madrid, España"
            value={preferences.originLocation || ''}
            onChange={(e) => setPreferences(prev => ({ ...prev, originLocation: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
          />
        </div>

        {/* Fechas del Viaje */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-blue-400" />
            <span className="text-sm font-medium">Fechas del Viaje</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8">Ida:</span>
              <input 
                type="date" 
                value={preferences.startDate || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, startDate: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500 text-white [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8">Vta:</span>
              <input 
                type="date" 
                value={preferences.endDate || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, endDate: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500 text-white [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Presupuesto Máximo */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-emerald-400" />
              <span className="text-sm font-medium">Presupuesto Máx.</span>
            </div>
            <span className="text-xs font-bold text-brand-400 bg-brand-900/50 px-2 py-0.5 rounded">
              {preferences.maxBudget} €
            </span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="10000" 
            step="50"
            value={preferences.maxBudget}
            onChange={(e) => setPreferences(prev => ({ ...prev, maxBudget: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
            <span>0 €</span>
            <span>10.000 €</span>
          </div>
        </div>

        {/* Nightstay Manager */}
        <div className="mb-6 pt-4 border-t border-slate-800">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              {preferences.preferNightTrains ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-400" />}
              <span className="text-sm font-medium group-hover:text-white transition-colors">Trenes Nocturnos</span>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                name="toggle" 
                id="toggle" 
                checked={preferences.preferNightTrains}
                onChange={(e) => setPreferences(prev => ({ ...prev, preferNightTrains: e.target.checked }))}
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-slate-600 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-brand-500"
              />
              <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${preferences.preferNightTrains ? 'bg-brand-500' : 'bg-slate-600'}`}></label>
            </div>
          </label>
          <p className="text-xs text-slate-500 mt-2">Optimiza las rutas para dormir en trenes/autobuses y ahorrar en hoteles.</p>
        </div>

        {/* Budget Level (Style) */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-slate-400" />
            <span className="text-sm font-medium">Estilo de Alojamiento</span>
          </div>
          <select 
            value={preferences.budgetLevel}
            onChange={(e) => setPreferences(prev => ({ ...prev, budgetLevel: e.target.value as any }))}
            className="w-full bg-slate-800 border border-slate-700 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-brand-500 text-white"
          >
            <option value="Budget">Económico (Hostales)</option>
            <option value="Standard">Estándar (Hoteles 3*)</option>
            <option value="Luxury">Lujo (Hoteles 4-5*)</option>
          </select>
        </div>

        {/* Pace */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-rose-400" />
            <span className="text-sm font-medium">Ritmo de Viaje</span>
          </div>
          <select 
            value={preferences.pace}
            onChange={(e) => setPreferences(prev => ({ ...prev, pace: e.target.value as any }))}
            className="w-full bg-slate-800 border border-slate-700 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-brand-500 text-white"
          >
            <option value="Relaxed">Relajado (Más tiempo por ciudad)</option>
            <option value="Moderate">Moderado (Equilibrado)</option>
            <option value="Fast">Rápido (Ver lo máximo posible)</option>
          </select>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        Desarrollado con Google Gemini<br/>Gemini 2.0 Flash
      </div>

      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl text-white">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Settings className="text-brand-400" size={20} /> Configuración de Gemini API Key
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Si despliegas la app en Vercel, puedes configurar la variable <code className="bg-slate-900 px-1 py-0.5 rounded text-brand-300">VITE_GEMINI_API_KEY</code> o introducir tu clave personal aquí:
            </p>
            <input
              type="password"
              placeholder="Tu API Key (AQ... o AIzaSy...)"
              value={customKeyInput}
              onChange={(e) => setCustomKeyInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-semibold text-white shadow"
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
