import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ItineraryOption } from '../types';
import { Loader2, Navigation, Compass } from 'lucide-react';

// Custom icon with glowing ring for interactive markers
const createCustomIcon = (dayNumber: number) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(13,148,136,0.4); transition: transform 0.2s ease;">${dayNumber}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Component to handle smooth flyToBounds and immediate size invalidation
const MapController: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  
  useEffect(() => {
    // Invalidate size on load & layout changes to prevent grey tile gaps
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
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      // Cinematic flyToBounds for ultra smooth map movement
      map.flyToBounds(bounds, { 
        padding: [60, 60], 
        maxZoom: 12,
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coordinates, map]);
  
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
}

export const MapView: React.FC<MapViewProps> = ({ option }) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTilesLoading, setIsTilesLoading] = useState(true);
  
  // Default center: Europe view
  const defaultCenter: [number, number] = [48.8566, 2.3522];

  // Filter days with valid coordinates
  const validDays = option?.days?.filter(
    d => d.coordinates && typeof d.coordinates.lat === 'number' && typeof d.coordinates.lng === 'number'
  ) || [];

  const positions: [number, number][] = validDays.map(d => [d.coordinates!.lat, d.coordinates!.lng]);

  const segments = [];
  for (let i = 0; i < validDays.length - 1; i++) {
    const start = validDays[i];
    const end = validDays[i + 1];
    const transportMode = end.transport?.[0]?.mode;
    
    segments.push({
      positions: [
        [start.coordinates!.lat, start.coordinates!.lng] as [number, number],
        [end.coordinates!.lat, end.coordinates!.lng] as [number, number]
      ],
      color: getTransportColor(transportMode)
    });
  }

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden">
      {/* Map Tile Loading Indicator */}
      {isTilesLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700 shadow-xl flex items-center gap-2 text-xs font-medium animate-fade-in">
          <Loader2 size={13} className="animate-spin text-brand-400" />
          <span>Cargando mapa en alta definición...</span>
        </div>
      )}

      <MapContainer 
        center={defaultCenter} 
        zoom={4} 
        className="h-full w-full z-0"
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
          onLoading={() => setIsTilesLoading(true)}
          onLoad={() => setIsTilesLoading(false)}
        />
        
        <MapController coordinates={positions} />
        
        {/* Animated Polylines connecting destinations */}
        {segments.map((seg, idx) => (
          <Polyline 
            key={`segment-${idx}`}
            positions={seg.positions} 
            color={seg.color} 
            weight={4} 
            dashArray="10, 10" 
            className="animated-route"
            opacity={0.85} 
          />
        ))}
        
        {/* Markers for each day */}
        {validDays.map((day, idx) => (
          <Marker 
            key={`marker-${idx}-${day.dayNumber}`} 
            position={[day.coordinates!.lat, day.coordinates!.lng]} 
            icon={createCustomIcon(day.dayNumber)}
          >
            <Popup className="rounded-2xl">
              <div className="font-sans p-1">
                <strong className="text-slate-900 text-sm font-bold block mb-1">Día {day.dayNumber}: {day.location}</strong>
                {day.theme && <span className="text-xs text-slate-500 block mb-2">{day.theme}</span>}
                {day.transport && day.transport.length > 0 && (
                  <div className="text-xs text-brand-600 font-semibold mt-2 pt-2 border-t border-slate-100 flex items-center gap-1">
                    <Navigation size={12} />
                    <span>Llegada en {day.transport[0].mode}</span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-20 right-4 z-[400] bg-slate-900/90 text-white backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-800 text-xs hidden sm:block">
        <div className="font-semibold mb-2 text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
          <Compass size={12} className="text-brand-400" />
          Transportes
        </div>
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-red-500 rounded-full"></div> Tren</div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-blue-500 rounded-full"></div> Autobús</div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-green-500 rounded-full"></div> Vuelo</div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-1.5 bg-teal-500 rounded-full"></div> Otro</div>
        </div>
      </div>
    </div>
  );
};
