import React, { useState } from 'react';
import { Map, Train, Bus, Plane, Ship, Footprints, Bed, Moon, MapPin, Info, AlertCircle, Coffee, Camera, Landmark, Clock, ExternalLink, ChevronDown, ChevronUp, Wallet, MessageSquarePlus, Bookmark, Trash2, Calendar, Navigation } from 'lucide-react';
import { TripPlan, DayPlan, Transport, Accommodation, POI, ItineraryOption } from '../types';
import { SavedTrip } from './Sidebar';

interface ItineraryViewProps {
  tripPlan: TripPlan | null;
  isUpdating: boolean;
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
  onAskCopilot?: (topic: string) => void;
  savedTrips?: SavedTrip[];
  onLoadTrip?: (trip: SavedTrip) => void;
  onDeleteTrip?: (tripId: string) => void;
  onSaveCurrentTrip?: () => void;
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

export const ItineraryView: React.FC<ItineraryViewProps> = ({ 
  tripPlan, 
  isUpdating, 
  selectedOptionId, 
  onSelectOption,
  onAskCopilot,
  savedTrips = [],
  onLoadTrip,
  onDeleteTrip,
  onSaveCurrentTrip
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');

  const handleAsk = (e: React.MouseEvent, topic: string) => {
    e.stopPropagation();
    if (onAskCopilot) {
      onAskCopilot(topic);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-Header Tabs in Itinerary View */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'current' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Calendar size={14} />
            <span>Ruta Actual</span>
          </button>
          
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${activeTab === 'saved' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bookmark size={14} />
            <span>Mis Viajes Guardados ({savedTrips.length})</span>
          </button>
        </div>

        {activeTab === 'current' && tripPlan?.options && tripPlan.options.length > 0 && onSaveCurrentTrip && (
          <button
            onClick={onSaveCurrentTrip}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
            title="Guardar este viaje en tu historial"
          >
            <Bookmark size={13} />
            <span>Guardar Viaje</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'saved' ? (
          /* SAVED TRIPS LIST TAB */
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bookmark size={16} className="text-brand-500" />
              Historial de Viajes Guardados
            </h3>

            {savedTrips.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <Bookmark size={40} className="mx-auto text-slate-300 mb-3 opacity-50" />
                <h4 className="font-bold text-slate-700 mb-1">Aún no has guardado ningún viaje</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Genera una ruta con el Copiloto IA y pulsa en "Guardar Viaje" para poder recuperarla en cualquier momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedTrips.map(trip => (
                  <div key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{trip.dateCreated}</span>
                        <button
                          onClick={() => onDeleteTrip && onDeleteTrip(trip.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                          title="Eliminar del historial"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h4 className="font-bold text-slate-800 text-base mb-1">{trip.title}</h4>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-brand-500" />
                          <span>{trip.origin}</span>
                        </div>
                        <span>→</span>
                        <div className="flex items-center gap-1">
                          <Navigation size={12} className="text-emerald-500" />
                          <span>{trip.destination}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onLoadTrip) onLoadTrip(trip);
                        setActiveTab('current');
                      }}
                      className="w-full mt-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Cargar e Inspeccionar</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CURRENT ROUTE ITINERARY TAB */
          <div className={`transition-opacity duration-500 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
            {(!tripPlan || !tripPlan.options || tripPlan.options.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center my-12">
                <Map size={48} className="mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">Aún no hay itinerario activo</h3>
                <p className="text-sm max-w-md">
                  Dime desde dónde sales y a dónde quieres ir en el chat inferior. Te prepararé 3 opciones de ruta diferentes.
                </p>
              </div>
            ) : (
              <>
                {/* Cabecera con el Origen */}
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Punto de Origen</div>
                      <div className="text-lg font-bold text-slate-800">{tripPlan.origin}</div>
                    </div>
                  </div>

                  {onAskCopilot && (
                    <button
                      onClick={(e) => handleAsk(e, `el origen ${tripPlan.origin}`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageSquarePlus size={14} />
                      <span>Consultar Origen</span>
                    </button>
                  )}
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
                        {/* Tarjeta Resumen */}
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

                        {/* Contenido Expandido */}
                        {isSelected && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                            
                            {/* Enlaces de Reserva */}
                            {option.bookingLinks && option.bookingLinks.length > 0 && (
                              <div className="mb-8">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Enlaces Útiles & Reservas</h5>
                                <div className="flex flex-wrap gap-2">
                                  {option.bookingLinks.map((link, idx) => (
                                    <div key={idx} className="inline-flex items-center bg-white border border-slate-200 rounded-full text-sm font-medium shadow-sm overflow-hidden group">
                                      <a 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 hover:text-brand-600 text-slate-700 px-3 py-1.5 transition-colors"
                                      >
                                        {link.type === 'Transport' ? <Train size={14} /> : link.type === 'Accommodation' ? <Bed size={14} /> : <ExternalLink size={14} />}
                                        {link.name}
                                      </a>
                                      {onAskCopilot && (
                                        <button
                                          onClick={(e) => handleAsk(e, `el enlace de reserva ${link.name} (${link.url})`)}
                                          className="px-2 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-500 hover:text-brand-600 border-l border-slate-200 transition-colors"
                                          title="Discutir este enlace en el chat"
                                        >
                                          <MessageSquarePlus size={13} />
                                        </button>
                                      )}
                                    </div>
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
                                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-brand-300 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        {day.location}
                                        {onAskCopilot && (
                                          <button
                                            onClick={(e) => handleAsk(e, `el Día ${day.dayNumber} en ${day.location}`)}
                                            className="text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 p-1 px-2 rounded-lg transition-colors font-normal flex items-center gap-1"
                                            title="Preguntar sobre este día"
                                          >
                                            <MessageSquarePlus size={12} />
                                            <span>Preguntar</span>
                                          </button>
                                        )}
                                      </h3>
                                      {day.theme && <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{day.theme}</span>}
                                    </div>

                                    {/* Transport Section */}
                                    {day.transport && day.transport.length > 0 && (
                                      <div className="mb-4 space-y-2">
                                        {day.transport.map((t, i) => (
                                          <div key={i} className="flex flex-col gap-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-start gap-2 flex-1">
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

                                              {onAskCopilot && (
                                                <button
                                                  onClick={(e) => handleAsk(e, `el transporte en ${t.mode} de ${t.from} a ${t.to}`)}
                                                  className="text-xs text-slate-500 hover:text-brand-600 hover:bg-white p-1 rounded transition-colors"
                                                  title="Consultar transporte en el chat"
                                                >
                                                  <MessageSquarePlus size={14} />
                                                </button>
                                              )}
                                            </div>

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
                                            <li key={i} className="text-sm border-b border-slate-100 pb-2 last:border-none last:pb-0">
                                              <div className="flex items-center justify-between gap-1.5 font-medium text-slate-800">
                                                <div className="flex items-center gap-1.5">
                                                  <POIIcon category={poi.category} />
                                                  {poi.name}
                                                </div>
                                                {onAskCopilot && (
                                                  <button
                                                    onClick={(e) => handleAsk(e, `el lugar de interés ${poi.name} en ${day.location}`)}
                                                    className="text-xs text-slate-400 hover:text-brand-600 p-1 rounded transition-colors"
                                                    title="Discutir esta atracción en el chat"
                                                  >
                                                    <MessageSquarePlus size={13} />
                                                  </button>
                                                )}
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
                                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <div>
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

                                        {onAskCopilot && (
                                          <button
                                            onClick={(e) => handleAsk(e, `el alojamiento ${day.accommodation?.name} en ${day.location}`)}
                                            className="text-xs text-slate-500 hover:text-brand-600 bg-slate-100 hover:bg-brand-50 p-1.5 rounded-lg transition-colors flex items-center gap-1"
                                            title="Discutir alojamiento en el chat"
                                          >
                                            <MessageSquarePlus size={13} />
                                            <span className="hidden sm:inline">Consultar</span>
                                          </button>
                                        )}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
