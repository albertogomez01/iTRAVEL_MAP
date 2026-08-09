import React from 'react';
import { Map, Train, Bus, Plane, Ship, Footprints, Bed, Moon, MapPin, Info, AlertCircle, Coffee, Camera, Landmark, Clock, ExternalLink, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { TripPlan, DayPlan, Transport, Accommodation, POI, ItineraryOption } from '../types';

interface ItineraryViewProps {
  tripPlan: TripPlan | null;
  isUpdating: boolean;
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
}

const TransportIcon = ({ mode }: { mode: string }) => {
  switch (mode.toLowerCase()) {
    case 'train': return <Train size={16} />;
    case 'bus': return <Bus size={16} />;
    case 'flight': return <Plane size={16} />;
    case 'ferry': return <Ship size={16} />;
    case 'walk': return <Footprints size={16} />;
    default: return <MapPin size={16} />;
  }
};

const POIIcon = ({ category }: { category: string }) => {
  switch (category.toLowerCase()) {
    case 'restaurant': return <Coffee size={14} className="text-orange-500" />;
    case 'monument': return <Landmark size={14} className="text-blue-500" />;
    case 'nature': return <Camera size={14} className="text-green-500" />;
    case 'museum': return <Landmark size={14} className="text-purple-500" />;
    default: return <MapPin size={14} className="text-slate-500" />;
  }
};

export const ItineraryView: React.FC<ItineraryViewProps> = ({ tripPlan, isUpdating, selectedOptionId, onSelectOption }) => {
  if (!tripPlan || !tripPlan.options || tripPlan.options.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <Map size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">Aún no hay itinerario</h3>
        <p className="text-sm max-w-md">
          Dime desde dónde sales y a dónde quieres ir. Te prepararé 3 opciones de ruta diferentes.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-6 transition-opacity duration-500 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
      
      {/* Cabecera con el Origen */}
      <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center shrink-0">
          <MapPin size={20} />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Punto de Origen</div>
          <div className="text-lg font-bold text-slate-800">{tripPlan.origin}</div>
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Opciones de Ruta</h3>
      
      <div className="space-y-4">
        {tripPlan.options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          
          return (
            <div 
              key={option.id} 
              className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 shadow-md' : 'border-slate-200 hover:border-brand-300 shadow-sm cursor-pointer'}`}
            >
              {/* Tarjeta Resumen (Clickable si no está seleccionada) */}
              <div 
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                onClick={() => !isSelected && onSelectOption(option.id)}
              >
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {option.title}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">{option.summary}</p>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                      <Clock size={14} className="text-brand-500" /> {option.totalDuration}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                      <Wallet size={14} className="text-emerald-500" /> {option.estimatedBudget}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectOption(isSelected ? '' : option.id); }}
                    className={`p-2 rounded-full transition-colors ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {isSelected ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Contenido Expandido (Enlaces y Timeline) */}
              {isSelected && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                  
                  {/* Enlaces de Reserva */}
                  {option.bookingLinks && option.bookingLinks.length > 0 && (
                    <div className="mb-8">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Enlaces Útiles</h5>
                      <div className="flex flex-wrap gap-2">
                        {option.bookingLinks.map((link, idx) => (
                          <a 
                            key={idx} 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-brand-400 hover:text-brand-600 text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm"
                          >
                            {link.type === 'Transport' ? <Train size={14} /> : link.type === 'Accommodation' ? <Bed size={14} /> : <ExternalLink size={14} />}
                            {link.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline del Itinerario */}
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {option.days.map((day, index) => (
                      <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        
                        {/* Timeline Node */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-brand-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <span className="text-sm font-bold">{day.dayNumber}</span>
                        </div>
                        
                        {/* Card del Día */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg text-slate-800">{day.location}</h3>
                            {day.theme && <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{day.theme}</span>}
                          </div>

                          {/* Transport Section con Duración Destacada */}
                          {day.transport && day.transport.length > 0 && (
                            <div className="mb-4 space-y-2">
                              {day.transport.map((t, i) => (
                                <div key={i} className="flex flex-col gap-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 text-brand-600"><TransportIcon mode={t.mode} /></div>
                                    <div className="flex-1">
                                      <div className="font-medium text-slate-700">
                                        {t.mode} {t.provider ? `(${t.provider})` : ''}: {t.from} → {t.to}
                                      </div>
                                      {t.requiresReservation && (
                                        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-medium">
                                          <AlertCircle size={12} /> Reserva Obligatoria
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Duración Destacada */}
                                  {t.duration && (
                                    <div className="flex items-center gap-1.5 bg-brand-100 text-brand-700 px-2.5 py-1 rounded-md w-fit text-xs font-bold ml-6">
                                      <Clock size={12} /> Duración: {t.duration}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* POIs Section */}
                          {day.pois && day.pois.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Destacados</h4>
                              <ul className="space-y-2">
                                {day.pois.map((poi, i) => (
                                  <li key={i} className="text-sm">
                                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                      <POIIcon category={poi.category} />
                                      {poi.name}
                                    </div>
                                    <p className="text-slate-600 text-xs mt-0.5 pl-5">{poi.description}</p>
                                    {poi.tips && (
                                      <div className="flex items-start gap-1 text-xs text-brand-600 mt-1 pl-5 italic">
                                        <Info size={12} className="mt-0.5 shrink-0" />
                                        <span>{poi.tips}</span>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Accommodation Section */}
                          {day.accommodation && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                {day.accommodation.type.includes('Night') ? (
                                  <Moon size={16} className="text-indigo-500" />
                                ) : (
                                  <Bed size={16} className="text-blue-500" />
                                )}
                                {day.accommodation.type}: {day.accommodation.name}
                              </div>
                              <div className="text-xs text-slate-500 pl-6 mt-0.5">{day.accommodation.location}</div>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
