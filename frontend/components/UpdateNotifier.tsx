import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const UpdateNotifier: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 0;
    if (!currentBuildTime) return;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.buildTime && Number(data.buildTime) > Number(currentBuildTime)) {
            setHasUpdate(true);
          }
        }
      } catch (e) {
        // Ignorar errores de red temporales
      }
    };

    // Comprobar cada 30 segundos
    const interval = setInterval(checkVersion, 30000);

    // Comprobar al dar foco o cambiar a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!hasUpdate || dismissed) return null;

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[1000] w-[94%] max-w-md animate-fade-in">
      <div className="bg-gradient-to-r from-brand-600 via-teal-600 to-emerald-600 text-white p-3 rounded-2xl shadow-[0_10px_35px_rgba(20,184,166,0.6)] border border-teal-300/40 backdrop-blur-xl flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
            <RefreshCw size={16} className="animate-spin text-white" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold flex items-center gap-1">
              <span>🚀 ¡Nueva versión disponible!</span>
              <Sparkles size={12} className="text-amber-300 animate-pulse" />
            </h4>
            <p className="text-[11px] text-teal-100 truncate">
              Hay actualizaciones en iTRAVEL_MAP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <RefreshCw size={12} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Descartar por ahora"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
