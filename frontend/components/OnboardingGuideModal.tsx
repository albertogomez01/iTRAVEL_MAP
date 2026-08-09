import React, { useState } from 'react';
import { Sparkles, Map, MessageSquare, Calendar, Bookmark, CheckCircle2, ArrowRight } from 'lucide-react';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      icon: Map,
      iconColor: 'text-teal-400 bg-teal-500/20 border-teal-500/30',
      title: 'Mapa Interactivo Permanente',
      description: 'El mapa siempre estará de fondo mostrando tus rutas, transporte y ciudades en tiempo real con animación de vuelo.',
    },
    {
      icon: MessageSquare,
      iconColor: 'text-brand-400 bg-brand-500/20 border-brand-500/30',
      title: 'Copiloto de IA en Tiempo Real',
      description: 'Chatea con el copiloto o escribe tu origen y destino para generar 3 itinerarios completos con presupuesto y duración.',
    },
    {
      icon: Calendar,
      iconColor: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
      title: 'Guarda Viajes y Consulta Enlaces',
      description: 'En la pestaña Itinerario puedes consultar reservas, hacer clic en la burbuja 💬 para preguntar sobre cualquier hotel o atracción, y guardar tus viajes.',
    }
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-brand-400" size={20} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guía Rápida</span>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-brand-500' : 'w-2 bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex flex-col items-center text-center my-4">
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-5 ${step.iconColor} shadow-lg`}>
            <step.icon size={32} />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed max-w-xs">{step.description}</p>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Saltar Guía
          </button>

          <button
            onClick={handleNext}
            className="bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-brand-500/20 active:scale-95"
          >
            <span>{currentStep === steps.length - 1 ? '¡Comenzar ahora!' : 'Siguiente'}</span>
            {currentStep === steps.length - 1 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
