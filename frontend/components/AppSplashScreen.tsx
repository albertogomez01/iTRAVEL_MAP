import React, { useEffect, useState } from 'react';
import { Sparkles, Compass } from 'lucide-react';

interface AppSplashScreenProps {
  onFinish?: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      if (onFinish) {
        setTimeout(onFinish, 600); // Allow fade-out transition to complete
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center p-6 text-white transition-opacity duration-700 ease-in-out select-none ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute w-96 h-96 bg-brand-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute w-72 h-72 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Animated Logo Container with Orbit Ring */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Rotating Cyan Orbit Ring */}
        <div className="absolute w-36 h-36 rounded-full border border-dashed border-brand-400/40 orbit-ring pointer-events-none" />
        
        {/* Animated 3D Logo */}
        <img 
          src="/logo.png" 
          alt="iTRAVEL_MAP Logo" 
          className="w-24 h-24 rounded-3xl object-cover animated-logo-glow border-2 border-brand-400/50 shadow-2xl relative z-10" 
        />
      </div>

      {/* App Branding Text */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-2 animate-fade-in">
        <span>iTRAVEL_MAP</span>
        <span className="text-xs bg-brand-500/20 text-brand-400 font-semibold px-2.5 py-1 rounded-full border border-brand-500/30">
          AI Copilot
        </span>
      </h1>

      <p className="text-xs sm:text-sm text-slate-400 max-w-xs text-center flex items-center gap-2 animate-fade-in">
        <Sparkles size={14} className="text-brand-400 animate-spin" />
        <span>Iniciando mapa interactivo y copiloto IA...</span>
      </p>
    </div>
  );
};
