import React, { useState, useEffect } from 'react';
import { Map, Train, Bus, Plane, Ship, Footprints, Bed, Moon, MapPin, Info, AlertCircle, Coffee, Camera, Landmark, Clock, ExternalLink, ChevronDown, ChevronUp, Wallet, MessageSquarePlus, Bookmark, Trash2, Calendar, Navigation, Locate, Download } from 'lucide-react';
import { TripPlan, DayPlan, Transport, Accommodation, POI, ItineraryOption, MapTarget, UserPreferences } from '../types';
import { SavedTrip } from './Sidebar';
import { generateItineraryPDF } from '../services/pdfService';
import { fetchCityWeather, CityWeather } from '../services/weatherService';

interface ItineraryViewProps {
  tripPlan: TripPlan | null;
  isUpdating: boolean;
  selectedOptionId: string | null;
  preferences?: UserPreferences;
  onSelectOption: (id: string) => void;
  onAskCopilot?: (topic: string) => void;
  onFocusTarget?: (target: MapTarget) => void;
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
  preferences,
  onSelectOption,
  onAskCopilot,
  onFocusTarget,
  savedTrips = [],
  onLoadTrip,
  onDeleteTrip,
  onSaveCurrentTrip
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const [weatherMap, setWeatherMap] = useState<Record<number, CityWeather>>({});

  useEffect(() => {
    let isMounted = true;
    const selectedOption = tripPlan?.options?.find(o => o.id === selectedOptionId) || tripPlan?.options?.[0];
    if (!selectedOption) return;

    const loadWeather = async () => {
      const newMap: Record<number, CityWeather> = {};
      for (const day of selectedOption.days) {
        if (day.coordinates) {
          const w = await fetchCityWeather(day.coordinates.lat, day.coordinates.lng);
          if (w) {
            newMap[day.dayNumber] = w;
          }
        }
      }
      if (isMounted) setWeatherMap(newMap);
    };

    loadWeather();
    return () => { isMounted = false; };
  }, [tripPlan, selectedOptionId]);

  const handleAsk = (e: React.MouseEvent, topic: string) => {
    e.stopPropagation();
    if (onAskCopilot) {
      onAskCopilot(topic);
    }
  };

  const handleFocus = (e: React.MouseEvent, target: MapTarget) => {
    e.stopPropagation();
    if (onFocusTarget) {
      onFocusTarget(target);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-Header Tabs in Itinerary View */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 rounded-2xl p-1.5 mb-2 shrink-0 text-white flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'current' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Calendar size={14} />
            <span>Ruta Actual</span>
          </button>
          
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${activeTab === 'saved' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Bookmark size={14} />
            <span>Guardados ({savedTrips.length})</span>
          </button>
        </div>

        {activeTab === 'current' && tripPlan?.options && tripPlan.options.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => generateItineraryPDF(tripPlan, selectedOptionId, preferences || { originLocation: tripPlan.origin, preferNightTrains: false, budgetLevel: 'Standard', pace: 'Moderate', maxBudget: 1500 })}
              className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Descargar este itinerario en PDF"
            >
              <Download size={13} />
              <span>Descargar PDF</span>
            </button>

            {onSaveCurrentTrip && (
              <button
                onClick={onSaveCurrentTrip}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Guardar este viaje en tu historial"
              >
                <Bookmark size={13} />
                <span className="hidden sm:inline">Guardar Viaje</span>
              </button>
            )}
          </div>
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
                <Map size={48} className="mb-4 opacity-20 text-teal-400" />
                <h3 className="text-lg font-medium text-slate-200 mb-2">Aún no hay itinerario activo</h3>
                <p className="text-sm text-slate-400 max-w-md">
                  Dime desde dónde sales y a dónde quieres ir en el chat inferior. Te prepararé 3 opciones de ruta diferentes.
                </p>
              </div>
            ) : (
              <>
                {/* Cabecera con el Origen */}
                <div className="mb-6 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center shrink-0 border border-teal-500/30">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Punto de Origen</div>
                      <div className="text-lg font-bold text-white">{tripPlan.origin}</div>
                    </div>
                  </div>

                  {onAskCopilot && (
                    <button
                      onClick={(e) => handleAsk(e, `el origen ${tripPlan.origin}`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 px-3 py-1.5 rounded-xl border border-teal-500/30 transition-all cursor-pointer"
                    >
                      <MessageSquarePlus size={14} />
                      <span>Consultar Origen</span>
                    </button>
                  )}
                </div>

                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">Opciones de Ruta Disponibles</h3>
                
                <div className="space-y-4">
                  {tripPlan.options.map((option, idx) => {
                    const isSelected = option.id === selectedOptionId || (!selectedOptionId && idx === 0);
                    const tagClass = idx === 0 
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                      : idx === 1 
                        ? 'bg-sky-950/80 text-sky-300 border-sky-500/40' 
                        : 'bg-purple-950/80 text-purple-300 border-purple-500/40';
                    const tagText = idx === 0 ? 'Opción 1 • Económica' : idx === 1 ? 'Opción 2 • Equilibrada' : 'Opción 3 • Rápida';
                    
                    return (
                      <div 
                        key={option.id} 
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-md ${isSelected ? 'bg-slate-900/95 border-teal-500/70 ring-2 ring-teal-500/20 shadow-2xl' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-lg cursor-pointer'}`}
                      >
                        {/* Tarjeta Resumen */}
                        <div 
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          onClick={() => !isSelected && onSelectOption(option.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${tagClass}`}>
                                {tagText}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                              {option.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">{option.summary}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                                <Clock size={14} className="text-teal-400" /> {option.totalDuration}
                              </div>
                              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                <Wallet size={14} /> {option.estimatedBudget}
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onSelectOption(isSelected ? '' : option.id); }}
                              className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                              {isSelected ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* Contenido Expandido */}
                        {isSelected && (
                          <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-5">
                            
                            {/* Enlaces de Reserva */}
                            {option.bookingLinks && option.bookingLinks.length > 0 && (
                              <div className="mb-6">
                                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Enlaces Útiles & Reservas</h5>
                                <div className="flex flex-wrap gap-2">
                                  {option.bookingLinks.map((link, idx) => (
                                    <div key={idx} className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium shadow-sm overflow-hidden group">
                                      <a 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 hover:text-teal-300 text-slate-300 px-3 py-1.5 transition-colors"
                                      >
                                        {link.type === 'Transport' ? <Train size={14} className="text-teal-400" /> : link.type === 'Accommodation' ? <Bed size={14} className="text-indigo-400" /> : <ExternalLink size={14} />}
                                        {link.name}
                                      </a>
                                      {onAskCopilot && (
                                        <button
                                          onClick={(e) => handleAsk(e, `el enlace de reserva ${link.name} (${link.url})`)}
                                          className="px-2 py-1.5 bg-slate-800/80 hover:bg-teal-900/50 text-slate-400 hover:text-teal-300 border-l border-slate-800 transition-colors"
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
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                              {option.days.map((day, index) => (
                                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                  
                                  {/* Timeline Node */}
                                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl border-2 border-teal-500/50 bg-slate-900 text-teal-300 font-extrabold text-sm shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                    <span>{day.dayNumber}</span>
                                  </div>
                                  
                                  {/* Card del Día - Clicking card centers & zooms map onto city */}
                                  <div 
                                    onClick={(e) => {
                                      if (day.coordinates && onFocusTarget) {
                                        handleFocus(e, { lat: day.coordinates.lat, lng: day.coordinates.lng, zoom: 14.5, label: day.location });
                                      }
                                    }}
                                    className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-xl hover:border-teal-500/60 hover:shadow-teal-900/20 transition-all cursor-pointer group/card"
                                  >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
                                      <h3 className="font-bold text-base text-white flex items-center gap-2 group-hover/card:text-teal-300 transition-colors">
                                        <span>Día {day.dayNumber}: {day.location}</span>
                                      </h3>

                                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {weatherMap[day.dayNumber] && (
                                          <div className="text-[11px] font-bold text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2 py-1 rounded-xl flex items-center gap-1 shrink-0" title={weatherMap[day.dayNumber].condition}>
                                            <span>{weatherMap[day.dayNumber].emoji}</span>
                                            <span>{weatherMap[day.dayNumber].tempMax}° / {weatherMap[day.dayNumber].tempMin}°C</span>
                                          </div>
                                        )}
                                        {day.coordinates && onFocusTarget && (
                                          <button
                                            onClick={(e) => handleFocus(e, { lat: day.coordinates!.lat, lng: day.coordinates!.lng, zoom: 14.5, label: day.location })}
                                            className="text-xs text-teal-300 bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 p-1 px-2 rounded-xl transition-all font-semibold flex items-center gap-1 active:scale-95 cursor-pointer"
                                            title="Centrar y hacer zoom en el mapa"
                                          >
                                            <Locate size={12} />
                                            <span>Ver Mapa</span>
                                          </button>
                                        )}
                                        {onAskCopilot && (
                                          <button
                                            onClick={(e) => handleAsk(e, `el Día ${day.dayNumber} en ${day.location}`)}
                                            className="text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 p-1 px-2 rounded-xl transition-colors font-medium flex items-center gap-1 active:scale-95 cursor-pointer"
                                            title="Preguntar sobre este día"
                                          >
                                            <MessageSquarePlus size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {day.theme && (
                                      <p className="text-xs text-teal-300/90 italic mb-3 bg-teal-950/40 p-2 rounded-xl border border-teal-500/20">
                                        🎯 {day.theme}
                                      </p>
                                    )}

                                    {/* Transport Section */}
                                    {day.transport && day.transport.length > 0 && (
                                      <div className="mb-3 space-y-2">
                                        {day.transport.map((t, i) => (
                                          <div key={i} className="flex flex-col gap-1.5 text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex items-start gap-2 flex-1">
                                                <div className="mt-0.5 text-teal-400"><TransportIcon mode={t.mode} /></div>
                                                <div className="flex-1">
                                                  <div className="font-semibold text-slate-200">
                                                    {t.mode} {t.provider ? `(${t.provider})` : ''}: {t.from} → {t.to}
                                                  </div>
                                                  {t.requiresReservation && (
                                                    <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-0.5 font-medium">
                                                      <AlertCircle size={11} /> Reserva Obligatoria
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {onAskCopilot && (
                                                <button
                                                  onClick={(e) => handleAsk(e, `el transporte en ${t.mode} de ${t.from} a ${t.to}`)}
                                                  className="text-slate-400 hover:text-teal-300 p-1 rounded transition-colors"
                                                  title="Consultar transporte en el chat"
                                                >
                                                  <MessageSquarePlus size={13} />
                                                </button>
                                              )}
                                            </div>

                                            {t.duration && (
                                              <div className="flex items-center gap-1 bg-teal-950/80 text-teal-300 px-2 py-0.5 rounded-lg w-fit text-[11px] font-bold border border-teal-500/30">
                                                <Clock size={11} /> Duración: {t.duration}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* POIs Section */}
                                    {day.pois && day.pois.length > 0 && (
                                      <div className="mb-3">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                          <Landmark size={11} className="text-teal-400" /> Lugares Destacados
                                        </h4>
                                        <ul className="space-y-1.5">
                                          {day.pois.map((poi, i) => (
                                            <li key={i} className="text-xs bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                                              <div className="flex items-center justify-between gap-1.5 font-semibold text-slate-200">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <POIIcon category={poi.category} />
                                                  <span className="truncate">{poi.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                  {poi.coordinates && onFocusTarget && (
                                                    <button
                                                      onClick={(e) => handleFocus(e, { lat: poi.coordinates!.lat, lng: poi.coordinates!.lng, zoom: 16, label: poi.name })}
                                                      className="text-[11px] text-teal-300 hover:bg-teal-900/50 px-1.5 py-0.5 rounded-lg transition-colors flex items-center gap-0.5 border border-teal-500/30"
                                                      title="Ver este sitio en el mapa"
                                                    >
                                                      <Locate size={11} />
                                                      <span>Mapa</span>
                                                    </button>
                                                  )}
                                                  {onAskCopilot && (
                                                    <button
                                                      onClick={(e) => handleAsk(e, `el lugar de interés ${poi.name} en ${day.location}`)}
                                                      className="text-slate-400 hover:text-teal-300 p-0.5 rounded transition-colors"
                                                      title="Discutir esta atracción en el chat"
                                                    >
                                                      <MessageSquarePlus size={12} />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                              {poi.description && <p className="text-slate-400 text-[11px] mt-1 pl-5">{poi.description}</p>}
                                              {poi.tips && (
                                                <div className="flex items-start gap-1 text-[11px] text-amber-300 mt-1 pl-5 italic bg-amber-950/30 p-1 rounded-lg border border-amber-500/20">
                                                  <Info size={11} className="mt-0.5 shrink-0 text-amber-400" />
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
                                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 truncate">
                                            {day.accommodation.type.includes('Night') ? (
                                              <Moon size={14} className="text-indigo-400 shrink-0" />
                                            ) : (
                                              <Bed size={14} className="text-sky-400 shrink-0" />
                                            )}
                                            <span className="truncate">{day.accommodation.type}: {day.accommodation.name}</span>
                                          </div>
                                          <div className="text-[11px] text-slate-400 pl-5 truncate">{day.accommodation.location}</div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                          {day.accommodation.coordinates && onFocusTarget && (
                                            <button
                                              onClick={(e) => handleFocus(e, { lat: day.accommodation!.coordinates!.lat, lng: day.accommodation!.coordinates!.lng, zoom: 16, label: day.accommodation!.name })}
                                              className="text-[11px] text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                              title="Ver hotel en el mapa"
                                            >
                                              <Locate size={11} />
                                              <span>Mapa</span>
                                            </button>
                                          )}
                                        </div>
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
