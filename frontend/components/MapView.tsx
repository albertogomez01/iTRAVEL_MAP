import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ItineraryOption, MapTarget } from '../types';
import { Loader2, Navigation, Compass, Layers, Bed, Landmark, Coffee, Camera, Eye, EyeOff, MessageSquarePlus, ZoomIn, ZoomOut, Search, Maximize2, MapPin } from 'lucide-react';
import { getRealisticRoute } from '../services/routeService';

// Custom icons
const createDayIcon = (dayNumber: number) => L.divIcon({
  className: 'custom-day-icon',
  html: `<div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2.5px solid white; box-shadow: 0 4px 14px rgba(13,148,136,0.5);">D${dayNumber}</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

const createHotelIcon = (name: string) => L.divIcon({
  className: 'custom-hotel-icon',
  html: `<div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 10px; padding: 4px 8px; display: flex; align-items: center; gap: 4px; font-weight: 600; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(79,70,229,0.4); white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">🏨 ${name}</div>`,
  iconSize: [130, 26],
  iconAnchor: [65, 13],
  popupAnchor: [0, -13]
});

const createOriginIcon = (name: string) => L.divIcon({
  className: 'custom-origin-icon',
  html: `<div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; border-radius: 12px; padding: 4px 10px; display: flex; align-items: center; gap: 4px; font-weight: bold; font-size: 11.5px; border: 2px solid white; box-shadow: 0 4px 14px rgba(22,163,74,0.5); white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">🚩 Origen: ${name}</div>`,
  iconSize: [140, 28],
  iconAnchor: [70, 14],
  popupAnchor: [0, -14]
});

const getPoiEmoji = (category: string) => {
  switch (category.toLowerCase()) {
    case 'monument': return '🏛️';
    case 'restaurant': return '🍽️';
    case 'nature': return '🌲';
    case 'museum': return '🎨';
    default: return '📍';
  }
};

const createPoiIcon = (name: string, category: string) => {
  const emoji = getPoiEmoji(category);
  return L.divIcon({
    className: 'custom-poi-icon',
    html: `<div style="background: #ffffff; color: #0f172a; border-radius: 8px; padding: 3.5px 7.5px; display: flex; align-items: center; gap: 4px; font-weight: 600; font-size: 11px; border: 2px solid #0d9488; box-shadow: 0 3px 10px rgba(0,0,0,0.2); white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${emoji} ${name}</div>`,
    iconSize: [120, 25],
    iconAnchor: [60, 12.5],
    popupAnchor: [0, -12.5]
  });
};

// Custom Zoom Control Buttons inside Leaflet context
const MapZoomButtons: React.FC<{ onZoomIn: () => void; onZoomOut: () => void }> = ({ onZoomIn, onZoomOut }) => {
  return (
    <div className="absolute top-20 left-4 z-[400] flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl text-white">
      <button
        onClick={onZoomIn}
        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-brand-500 text-white flex items-center justify-center font-bold text-lg transition-colors active:scale-95"
        title="Acercar (Zoom +)"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-brand-500 text-white flex items-center justify-center font-bold text-lg transition-colors active:scale-95"
        title="Alejar (Zoom -)"
      >
        <ZoomOut size={16} />
      </button>
    </div>
  );
};

// Component to handle smooth flyTo / flyToBounds
const MapController: React.FC<{ 
  coordinates: [number, number][]; 
  focusedTarget?: MapTarget | null;
  internalTarget?: MapTarget | null;
}> = ({ coordinates, focusedTarget, internalTarget }) => {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [map]);

  useEffect(() => {
    const target = internalTarget || focusedTarget;
    if (target && typeof target.lat === 'number' && typeof target.lng === 'number') {
      map.flyTo([target.lat, target.lng], target.zoom || 14, { 
        duration: 1.5, 
        easeLinearity: 0.25 
      });
    } else if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.flyToBounds(bounds, { 
        padding: [60, 60], 
        maxZoom: 12,
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coordinates, focusedTarget, internalTarget, map]);
  
  return null;
};

// Helper to handle manual zoom in/out
const MapActionsController: React.FC<{
  setZoomInHandler: (fn: () => void) => void;
  setZoomOutHandler: (fn: () => void) => void;
}> = ({ setZoomInHandler, setZoomOutHandler }) => {
  const map = useMap();

  useEffect(() => {
    setZoomInHandler(() => () => map.zoomIn());
    setZoomOutHandler(() => () => map.zoomOut());
  }, [map, setZoomInHandler, setZoomOutHandler]);

  return null;
};

// Helper to determine route color based on transport mode
const getTransportColor = (mode?: string) => {
  if (!mode) return '#0d9488';
  switch (mode.toLowerCase()) {
    case 'bus': return '#3b82f6';
    case 'train': return '#ef4444';
    case 'flight': return '#22c55e';
    case 'ferry': return '#0ea5e9';
    case 'walk': return '#f59e0b';
    default: return '#0d9488';
  }
};

interface MapViewProps {
  option: ItineraryOption | null;
  origin?: string;
  originCoordinates?: { lat: number; lng: number };
  tripType?: 'RoundTrip' | 'OneWay';
  focusedTarget?: MapTarget | null;
  onAskCopilot?: (topic: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ 
  option, 
  origin, 
  originCoordinates, 
  tripType = 'RoundTrip', 
  focusedTarget, 
  onAskCopilot 
}) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTilesLoading, setIsTilesLoading] = useState(true);

  // Layer visibility toggles
  const [showMainRoutes, setShowMainRoutes] = useState(true);
  const [showDayPaths, setShowDayPaths] = useState(true);
  const [showHotels, setShowHotels] = useState(true);
  const [showPois, setShowPois] = useState(true);

  // Internal city focus state
  const [internalTarget, setInternalTarget] = useState<MapTarget | null>(null);

  // Zoom handlers
  const [zoomInFn, setZoomInFn] = useState<(() => void) | null>(null);
  const [zoomOutFn, setZoomOutFn] = useState<(() => void) | null>(null);

  // Calculated realistic inter-city routes
  const [realisticSegments, setRealisticSegments] = useState<{
    positions: [number, number][];
    color: string;
    mode: string;
  }[]>([]);
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  
  // Default center: Europe view
  const defaultCenter: [number, number] = [48.8566, 2.3522];

  // Origin Position
  const originPos: [number, number] | null = originCoordinates && typeof originCoordinates.lat === 'number' && typeof originCoordinates.lng === 'number'
    ? [originCoordinates.lat, originCoordinates.lng]
    : null;

  // Filter days with valid coordinates
  const validDays = option?.days?.filter(
    d => d.coordinates && typeof d.coordinates.lat === 'number' && typeof d.coordinates.lng === 'number'
  ) || [];

  const mainPositions: [number, number][] = validDays.map(d => [d.coordinates!.lat, d.coordinates!.lng]);
  const allPositions: [number, number][] = originPos ? [originPos, ...mainPositions] : mainPositions;

  // Async route calculation effect using OSRM & curved fallbacks
  useEffect(() => {
    let isMounted = true;

    const fetchAllRoutes = async () => {
      if (!validDays || validDays.length === 0) {
        if (isMounted) setRealisticSegments([]);
        return;
      }

      setIsCalculatingRoutes(true);
      const newSegments: { positions: [number, number][]; color: string; mode: string }[] = [];

      // 1. Initial Leg: Origin -> Day 1 City (if originPos exists)
      if (originPos && validDays[0]?.coordinates) {
        const day1Pos: [number, number] = [validDays[0].coordinates.lat, validDays[0].coordinates.lng];
        const distToDay1 = Math.hypot(originPos[0] - day1Pos[0], originPos[1] - day1Pos[1]);
        if (distToDay1 > 0.001) {
          const day1Mode = validDays[0].transport?.[0]?.mode || 'Train';
          const polylineCoords = await getRealisticRoute(originPos, day1Pos, day1Mode);
          newSegments.push({
            positions: polylineCoords,
            color: getTransportColor(day1Mode),
            mode: day1Mode
          });
        }
      }

      // 2. Intermediate Legs: Day i -> Day i+1
      for (let i = 0; i < validDays.length - 1; i++) {
        const start = validDays[i];
        const end = validDays[i + 1];
        const mode = end.transport?.[0]?.mode || 'Train';

        const from: [number, number] = [start.coordinates!.lat, start.coordinates!.lng];
        const to: [number, number] = [end.coordinates!.lat, end.coordinates!.lng];

        const polylineCoords = await getRealisticRoute(from, to, mode);
        newSegments.push({
          positions: polylineCoords,
          color: getTransportColor(mode),
          mode
        });
      }

      // 3. Return Leg: Last Day City -> Origin (if RoundTrip)
      const isRoundTrip = !tripType || tripType === 'RoundTrip';
      if (isRoundTrip && originPos && validDays.length > 0) {
        const lastDay = validDays[validDays.length - 1];
        const lastPos: [number, number] = [lastDay.coordinates!.lat, lastDay.coordinates!.lng];
        const distToOrigin = Math.hypot(lastPos[0] - originPos[0], lastPos[1] - originPos[1]);
        if (distToOrigin > 0.001) {
          const returnTransport = lastDay.transport.find(t => t.to === origin || t.notes?.includes('vuelta')) || lastDay.transport[lastDay.transport.length - 1];
          const returnMode = returnTransport?.mode || 'Train';
          const polylineCoords = await getRealisticRoute(lastPos, originPos, returnMode);
          newSegments.push({
            positions: polylineCoords,
            color: getTransportColor(returnMode),
            mode: returnMode
          });
        }
      }

      if (isMounted) {
        setRealisticSegments(newSegments);
        setIsCalculatingRoutes(false);
      }
    };

    fetchAllRoutes();

    return () => {
      isMounted = false;
    };
  }, [option, originCoordinates, tripType]);

  // Intra-city local paths (station -> hotel -> POIs -> hotel)
  const dayLocalPaths = validDays.map(day => {
    const points: [number, number][] = [];
    const cityPos: [number, number] = [day.coordinates!.lat, day.coordinates!.lng];
    points.push(cityPos);

    if (day.accommodation?.coordinates) {
      points.push([day.accommodation.coordinates.lat, day.accommodation.coordinates.lng]);
    }

    if (day.pois && day.pois.length > 0) {
      day.pois.forEach(poi => {
        if (poi.coordinates) {
          points.push([poi.coordinates.lat, poi.coordinates.lng]);
        }
      });
    }

    if (day.accommodation?.coordinates && points.length > 2) {
      points.push([day.accommodation.coordinates.lat, day.accommodation.coordinates.lng]);
    }

    return {
      dayNumber: day.dayNumber,
      location: day.location,
      positions: points
    };
  }).filter(p => p.positions.length >= 2);

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden">
      {/* Map Tile & Route Loading Indicator */}
      {(isTilesLoading || isCalculatingRoutes) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700 shadow-xl flex items-center gap-2 text-xs font-medium animate-fade-in">
          <Loader2 size={13} className="animate-spin text-brand-400" />
          <span>{isCalculatingRoutes ? 'Calculando ruteo OSRM en tiempo real...' : 'Cargando mapa en alta definición...'}</span>
        </div>
      )}

      {/* Direct Leaflet Zoom Controls */}
      <MapZoomButtons 
        onZoomIn={() => zoomInFn && zoomInFn()} 
        onZoomOut={() => zoomOutFn && zoomOutFn()} 
      />

      <MapContainer 
        center={defaultCenter} 
        zoom={4} 
        className="h-full w-full z-0"
        zoomControl={false}
        whenReady={() => {
          setIsMapReady(true);
          setIsTilesLoading(false);
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          keepBuffer={4}
          updateWhenIdle={false}
          updateWhenZooming={true}
          eventHandlers={{
            loading: () => setIsTilesLoading(true),
            load: () => setIsTilesLoading(false)
          }}
        />
        
        <MapController 
          coordinates={allPositions} 
          focusedTarget={focusedTarget} 
          internalTarget={internalTarget}
        />

        <MapActionsController 
          setZoomInHandler={setZoomInFn}
          setZoomOutHandler={setZoomOutFn}
        />
        
        {/* 1. Inter-city Realistic OSRM Polylines */}
        {showMainRoutes && realisticSegments.map((seg, idx) => (
          <Polyline 
            key={`segment-${idx}`}
            positions={seg.positions} 
            color={seg.color} 
            weight={4.5} 
            dashArray={seg.mode.toLowerCase() === 'flight' ? '8, 8' : undefined}
            className="animated-route"
            opacity={0.85} 
          />
        ))}

        {/* 2. Intra-city Local Day Paths */}
        {showDayPaths && dayLocalPaths.map((lp, idx) => (
          <Polyline 
            key={`local-path-${idx}-${lp.dayNumber}`}
            positions={lp.positions}
            color="#f59e0b"
            weight={2.5}
            dashArray="5, 6"
            opacity={0.7}
          />
        ))}

        {/* 2.5 Origin Marker */}
        {originPos && (
          <Marker
            position={originPos}
            icon={createOriginIcon(origin || 'Origen')}
          >
            <Popup className="rounded-2xl">
              <div className="font-sans p-1">
                <strong className="text-slate-900 text-sm font-bold block mb-1">Punto de Origen: {origin}</strong>
                <span className="text-xs text-slate-500 block mb-2">Punto de salida del itinerario</span>
                <button
                  onClick={() => setInternalTarget({ lat: originPos[0], lng: originPos[1], zoom: 13.5, label: origin })}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <ZoomIn size={13} />
                  <span>Zoom a Origen</span>
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. Main Day Center Markers */}
        {validDays.map((day, idx) => (
          <Marker 
            key={`day-marker-${idx}-${day.dayNumber}`} 
            position={[day.coordinates!.lat, day.coordinates!.lng]} 
            icon={createDayIcon(day.dayNumber)}
          >
            <Popup className="rounded-2xl">
              <div className="font-sans p-1">
                <strong className="text-slate-900 text-sm font-bold block mb-1">Día {day.dayNumber}: {day.location}</strong>
                {day.theme && <span className="text-xs text-slate-500 block mb-2">{day.theme}</span>}
                
                <button
                  onClick={() => setInternalTarget({ lat: day.coordinates!.lat, lng: day.coordinates!.lng, zoom: 14.5, label: day.location })}
                  className="w-full text-xs bg-brand-500 hover:bg-brand-600 text-white font-medium py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 mb-2 shadow-sm"
                >
                  <ZoomIn size={13} />
                  <span>Agrandar Ciudad y Ver Hoteles</span>
                </button>

                {day.transport && day.transport.length > 0 && (
                  <div className="text-xs text-brand-600 font-semibold pt-1 border-t border-slate-100 flex items-center gap-1">
                    <Navigation size={12} />
                    <span>Llegada en {day.transport[0].mode}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Hotel / Accommodation Markers */}
        {showHotels && validDays.map((day, idx) => {
          if (!day.accommodation?.coordinates) return null;
          const acc = day.accommodation;
          return (
            <Marker
              key={`hotel-marker-${idx}-${day.dayNumber}`}
              position={[acc.coordinates.lat, acc.coordinates.lng]}
              icon={createHotelIcon(acc.name)}
            >
              <Popup className="rounded-2xl">
                <div className="font-sans p-1 max-w-xs">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Bed size={12} /> Hotel Recomendado (Día {day.dayNumber})
                  </div>
                  <strong className="text-slate-900 text-sm font-bold block mb-1">{acc.name}</strong>
                  <span className="text-xs text-slate-600 block mb-1">{acc.location}</span>
                  {acc.notes && <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-1 mt-1 mb-2">{acc.notes}</p>}
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => setInternalTarget({ lat: acc.coordinates!.lat, lng: acc.coordinates!.lng, zoom: 16 })}
                      className="flex-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <ZoomIn size={12} />
                      <span>Zoom Hotel</span>
                    </button>
                    {onAskCopilot && (
                      <button
                        onClick={() => onAskCopilot(`el hotel ${acc.name} en ${day.location}`)}
                        className="flex-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquarePlus size={12} />
                        <span>Preguntar</span>
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 5. POI Markers (Monuments, Restaurants, Museums, Nature) */}
        {showPois && validDays.map((day) => 
          (day.pois || []).map((poi, pIdx) => {
            if (!poi.coordinates) return null;
            return (
              <Marker
                key={`poi-marker-${day.dayNumber}-${pIdx}`}
                position={[poi.coordinates.lat, poi.coordinates.lng]}
                icon={createPoiIcon(poi.name, poi.category)}
              >
                <Popup className="rounded-2xl">
                  <div className="font-sans p-1 max-w-xs">
                    <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <span>{getPoiEmoji(poi.category)}</span>
                      <span>{poi.category} • Día {day.dayNumber}</span>
                    </div>
                    <strong className="text-slate-900 text-sm font-bold block mb-1">{poi.name}</strong>
                    <p className="text-xs text-slate-600 mb-1">{poi.description}</p>
                    {poi.tips && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-100 italic mb-2">
                        💡 {poi.tips}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setInternalTarget({ lat: poi.coordinates!.lat, lng: poi.coordinates!.lng, zoom: 16 })}
                        className="flex-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <ZoomIn size={12} />
                        <span>Zoom Sitio</span>
                      </button>
                      {onAskCopilot && (
                        <button
                          onClick={() => onAskCopilot(`el punto de interés ${poi.name} en ${day.location}`)}
                          className="flex-1 text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageSquarePlus size={12} />
                          <span>Preguntar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>

      {/* Floating Right Control Panel (Capas, Agrandar Ciudad, Leyenda) */}
      <div className="absolute top-20 right-4 z-[400] flex flex-col gap-3 max-w-[210px]">
        
        {/* 1. Capas del Mapa */}
        <div className="bg-slate-900/90 text-white backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-800 text-xs flex flex-col gap-2">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1 mb-1">
            <Layers size={13} className="text-brand-400" />
            Capas del Mapa
          </div>

          <button 
            onClick={() => setShowMainRoutes(!showMainRoutes)}
            className={`flex items-center justify-between gap-3 px-2.5 py-1 rounded-lg transition-colors text-[11px] ${showMainRoutes ? 'bg-slate-800 text-brand-300' : 'text-slate-500 hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Trayectos Tren/Bus</span>
            {showMainRoutes ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          <button 
            onClick={() => setShowDayPaths(!showDayPaths)}
            className={`flex items-center justify-between gap-3 px-2.5 py-1 rounded-lg transition-colors text-[11px] ${showDayPaths ? 'bg-slate-800 text-amber-300' : 'text-slate-500 hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Rutas Urbanas del Día</span>
            {showDayPaths ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          <button 
            onClick={() => setShowHotels(!showHotels)}
            className={`flex items-center justify-between gap-3 px-2.5 py-1 rounded-lg transition-colors text-[11px] ${showHotels ? 'bg-slate-800 text-indigo-300' : 'text-slate-500 hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-1.5">🏨 Hoteles Recomendados</span>
            {showHotels ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          <button 
            onClick={() => setShowPois(!showPois)}
            className={`flex items-center justify-between gap-3 px-2.5 py-1 rounded-lg transition-colors text-[11px] ${showPois ? 'bg-slate-800 text-teal-300' : 'text-slate-500 hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-1.5">🏛️ Sitios a Visitar (POIs)</span>
            {showPois ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>

        {/* 2. Agrandar Ciudad (Debajo de las capas con el mismo formato) */}
        {validDays.length > 0 && (
          <div className="bg-slate-900/90 text-white backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-800 text-xs flex flex-col gap-2">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1 mb-1">
              <Search size={13} className="text-brand-400" />
              Agrandar Ciudad
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {validDays.map((day, idx) => (
                <button
                  key={`city-zoom-${idx}`}
                  onClick={() => {
                    if (day.coordinates) {
                      setInternalTarget({ lat: day.coordinates.lat, lng: day.coordinates.lng, zoom: 14.5, label: day.location });
                    }
                  }}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-[11px] bg-slate-800 hover:bg-brand-500 text-white font-medium active:scale-95 border border-slate-700/60 text-left"
                >
                  <span className="truncate">📍 D{day.dayNumber}: {day.location}</span>
                  <ZoomIn size={12} className="shrink-0 text-brand-300" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setInternalTarget(null)}
              className="mt-0.5 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors border border-slate-700/60"
              title="Ver mapa completo"
            >
              <Maximize2 size={12} />
              <span>Vista General</span>
            </button>
          </div>
        )}

        {/* 3. Leyenda de Transporte */}
        <div className="bg-slate-900/90 text-white backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-800 text-xs">
          <div className="font-semibold mb-2 text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Compass size={12} className="text-brand-400" />
            Leyenda de Transporte
          </div>
          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-red-500 rounded-full"></div> Tren</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-blue-500 rounded-full"></div> Autobús</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-green-500 rounded-full"></div> Vuelo</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-teal-500 rounded-full"></div> Ferry</div>
          </div>
        </div>

      </div>
    </div>
  );
};
