import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export const UpdateNotifier: React.FC = () => {
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const currentBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 0;
    if (!currentBuildTime) return;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.buildTime && Number(data.buildTime) > Number(currentBuildTime)) {
            setIsReloading(true);
            // Automatic seamless reload after brief toast notification
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          }
        }
      } catch (e) {
        // Suppress temporary network glitches
      }
    };

    // Poll every 15 seconds for automatic version updates
    const interval = setInterval(checkVersion, 15000);

    // Also check immediately when user switches back to the app/tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkVersion);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!isReloading) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[2000] w-[92%] max-w-md animate-fade-in">
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white p-3 rounded-2xl shadow-[0_10px_35px_rgba(20,184,166,0.6)] border border-teal-300/50 backdrop-blur-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
            <RefreshCw size={18} className="animate-spin text-white" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold flex items-center gap-1 text-white">
              <span>🚀 ¡Nueva versión detectada!</span>
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
            </h4>
            <p className="text-[11px] text-teal-100 font-medium">
              Actualizando la aplicación automáticamente...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
