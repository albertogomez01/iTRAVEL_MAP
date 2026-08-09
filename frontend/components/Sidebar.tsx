import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Wallet, Activity, Loader2, Calendar, Banknote, MapPin, X, Check, RotateCcw, Bookmark, Trash2, Navigation } from 'lucide-react';
import { UserPreferences } from '../types';
import { CityAutocompleteInput } from './CityAutocompleteInput';

import { loginWithGoogle, logoutUser } from '../services/firebase';
import { getApiKey, setCustomApiKey } from '../services/aiService';

export interface SavedTrip {
  id: string;
  title: string;
  origin: string;
  destination: string;
  dateCreated: string;
  preferences: UserPreferences;
  messages: any[];
  tripPlan: any;
}

interface SidebarProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  user: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  onOpenLoginModal?: () => void;
  onApplyPreferences?: (updatedPrefs: UserPreferences, destination?: string) => void;
  savedTrips?: SavedTrip[];
  onLoadTrip?: (trip: SavedTrip) => void;
  onDeleteTrip?: (tripId: string) => void;
  onSaveCurrentTrip?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  preferences,
  setPreferences,
  user,
  isOpenMobile = false,
  onCloseMobile,
  onLogout,
  onOpenLoginModal,
  onApplyPreferences,
  savedTrips = [],
  onLoadTrip,
  onDeleteTrip,
  onSaveCurrentTrip
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(getApiKey());

  const [activeTab, setActiveTab] = useState<'config' | 'saved'>('config');

  // Draft preferences for user edits before clicking "Aplicar"
  const [draftPrefs, setDraftPrefs] = useState<UserPreferences>({ ...preferences });
  const [destinationInput, setDestinationInput] = useState('');

  useEffect(() => {
    setDraftPrefs({ ...preferences });
  }, [preferences]);

  const handleSaveApiKey = () => {
    setCustomApiKey(customKeyInput.trim());
    setShowKeyModal(false);
    alert("API Key de Gemini guardada correctamente.");
  };

  const handleApply = () => {
    setPreferences(draftPrefs);
    if (onApplyPreferences) {
      onApplyPreferences(draftPrefs, destinationInput);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleUndoConfirm = () => {
    setDraftPrefs({ ...preferences });
    setDestinationInput('');
    setShowUndoConfirmModal(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-80 md:w-72 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
        {/* App Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-md font-black text-sm">
              iT
            </div>
            <h1 className="font-bold tracking-wide">iTRAVEL_MAP</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="Configurar API Key de Gemini"
            >
              <Settings size={16} />
            </button>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors md:hidden ml-1"
                title="Cerrar menú"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Profile & Google Auth Section */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/40">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-8 h-8 rounded-full border border-brand-500 shadow-sm shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user.displayName ? user.displayName[0] : 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{user.displayName || 'Usuario'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logoutUser();
                  if (onLogout) onLogout();
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md text-xs transition-colors shrink-0 ml-1"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenLoginModal ? onOpenLoginModal() : loginWithGoogle()}
              className="w-full bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              Iniciar Sesión
            </button>
          )}
        </div>

        {/* Configuración de Datos de Viaje */}
        <div className="p-4 flex-1 overflow-y-auto space-y-5">
            
            {/* Origen del Viaje con Autocompletado */}
            <div>
              <CityAutocompleteInput
                label="Ciudad de Origen"
                placeholder="Ej. Madrid, España"
                value={draftPrefs.originLocation || ''}
                onChange={(val) => setDraftPrefs(prev => ({ ...prev, originLocation: val }))}
                iconColor="text-red-400"
              />
            </div>

            {/* Destino Principal con Autocompletado */}
            <div>
              <CityAutocompleteInput
                label="Ciudad o País de Destino"
                placeholder="Ej. Roma, Italia"
                value={destinationInput}
                onChange={(val) => setDestinationInput(val)}
                iconColor="text-teal-400"
              />
            </div>

            {/* Fechas del Viaje */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={15} className="text-blue-400" />
                <span className="text-xs font-medium text-slate-300">Fechas del Viaje</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-8">Ida:</span>
                  <input 
                    type="date" 
                    value={draftPrefs.startDate || ''}
                    onChange={(e) => setDraftPrefs(prev => ({ ...prev, startDate: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-500 text-white [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-8">Vta:</span>
                  <input 
                    type="date" 
                    value={draftPrefs.endDate || ''}
                    onChange={(e) => setDraftPrefs(prev => ({ ...prev, endDate: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-500 text-white [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Presupuesto Máximo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Banknote size={15} className="text-emerald-400" />
                  <span className="text-xs font-medium text-slate-300">Presupuesto Máx.</span>
                </div>
                <span className="text-xs font-bold text-brand-400 bg-brand-950 px-2 py-0.5 rounded border border-brand-800/60">
                  {draftPrefs.maxBudget} €
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="50"
                value={draftPrefs.maxBudget}
                onChange={(e) => setDraftPrefs(prev => ({ ...prev, maxBudget: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0 €</span>
                <span>10.000 €</span>
              </div>
            </div>

            {/* Nightstay Manager */}
            <div className="pt-3 border-t border-slate-800">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  {draftPrefs.preferNightTrains ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-400" />}
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Trenes Nocturnos</span>
                </div>
                <div className="relative inline-block w-9 mr-1 align-middle select-none transition duration-200 ease-in">
                  <input 
                    type="checkbox" 
                    name="toggle" 
                    id="toggle" 
                    checked={draftPrefs.preferNightTrains}
                    onChange={(e) => setDraftPrefs(prev => ({ ...prev, preferNightTrains: e.target.checked }))}
                    className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 border-slate-600 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-brand-500"
                  />
                  <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${draftPrefs.preferNightTrains ? 'bg-brand-500' : 'bg-slate-600'}`}></label>
                </div>
              </label>
            </div>

            {/* Estilo y Ritmo */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Alojamiento</label>
                <select 
                  value={draftPrefs.budgetLevel}
                  onChange={(e) => setDraftPrefs(prev => ({ ...prev, budgetLevel: e.target.value as any }))}
                  className="w-full bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Budget">Económico</option>
                  <option value="Standard">Estándar</option>
                  <option value="Luxury">Lujo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Ritmo</label>
                <select 
                  value={draftPrefs.pace}
                  onChange={(e) => setDraftPrefs(prev => ({ ...prev, pace: e.target.value as any }))}
                  className="w-full bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Relaxed">Relajado</option>
                  <option value="Moderate">Moderado</option>
                  <option value="Fast">Rápido</option>
                </select>
              </div>
            </div>

            {/* Control Action Buttons (Aplicar & Deshacer) */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowUndoConfirmModal(true)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
              >
                <RotateCcw size={14} />
                <span>Deshacer</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="py-2.5 px-3 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-600/30"
              >
                <Check size={14} />
                <span>Aplicar</span>
              </button>
            </div>

          </div>

        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Desarrollado con Google Gemini 3.6 Flash
        </div>

        {/* Modal Confirmación Deshacer */}
        {showUndoConfirmModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl text-white text-center">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw size={20} />
              </div>
              <h3 className="text-sm font-bold mb-1">¿Deshacer cambios?</h3>
              <p className="text-xs text-slate-400 mb-4">
                ¿Estás seguro de que quieres descartar las modificaciones sin aplicar y restaurar los datos anteriores?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUndoConfirmModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUndoConfirm}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white shadow"
                >
                  Sí, Deshacer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Key Settings */}
        {showKeyModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white">
              <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                <Settings className="text-brand-400" size={18} /> Configuración de Gemini API Key
              </h3>
              <p className="text-xs text-slate-300 mb-4">
                Puedes introducir tu clave personal de Google Gemini aquí:
              </p>
              <input
                type="password"
                placeholder="Tu API Key (AQ... o AIzaSy...)"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs mb-4 focus:outline-none focus:border-brand-500 text-white placeholder-slate-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-semibold text-white shadow"
                >
                  Guardar Clave
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};
