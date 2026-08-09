import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ItineraryOption } from '../types';

// Custom icon to avoid missing image issues with default Leaflet markers in ESM
const createCustomIcon = (dayNumber: number) => L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: #14b8a6; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${dayNumber}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

// Component to automatically fit the map bounds to the route
const MapBounds: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      // Add padding so markers aren't cut off at the edges
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [coordinates, map]);
  
  return null;
};

// Helper to determine route color based on transport mode
const getTransportColor = (mode?: string) => {
  if (!mode) return '#0d9488'; // Default brand color
  switch (mode.toLowerCase()) {
    case 'bus': return '#3b82f6'; // Blue
    case 'train': return '#ef4444'; // Red
    case 'flight': return '#22c55e'; // Green
    case 'ferry': return '#0ea5e9'; // Teal
    case 'walk': return '#f59e0b'; // Amber
    default: return '#0d9488'; // Default brand color
  }
};

interface MapViewProps {
  option: ItineraryOption | null;
}

export const MapView: React.FC<MapViewProps> = ({ option }) => {
  // Default center to Europe so the map is always visible and looks good initially
  const defaultCenter: [number, number] = [48.8566, 2.3522];

  // Filter days that have valid coordinates
  const validDays = option?.days?.filter(
    d => d.coordinates && typeof d.coordinates.lat === 'number' && typeof d.coordinates.lng === 'number'
  ) || [];

  const positions: [number, number][] = validDays.map(d => [d.coordinates!.lat, d.coordinates!.lng]);

  // Create segments for polylines to color them individually
  const segments = [];
  for (let i = 0; i < validDays.length - 1; i++) {
    const start = validDays[i];
    const end = validDays[i + 1];
    // The transport mode to get to the 'end' destination
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
    <div className="relative h-full w-full">
      <MapContainer center={defaultCenter} zoom={4} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {positions.length > 0 && <MapBounds coordinates={positions} />}
        
        {/* Draw animated lines connecting the days */}
        {segments.map((seg, idx) => (
          <Polyline 
            key={`segment-${idx}`}
            positions={seg.positions} 
            color={seg.color} 
            weight={4} 
            dashArray="12, 12" 
            className="animated-route"
            opacity={0.8} 
          />
        ))}
        
        {/* Place markers for each day */}
        {validDays.map((day, idx) => (
          <Marker 
            key={`marker-${idx}-${day.dayNumber}`} 
            position={[day.coordinates!.lat, day.coordinates!.lng]} 
            icon={createCustomIcon(day.dayNumber)}
          >
            <Popup className="rounded-xl">
              <div className="font-sans">
                <strong className="text-slate-800 text-sm block mb-1">Día {day.dayNumber}: {day.location}</strong>
                {day.theme && <span className="text-xs text-slate-500 block mb-2">{day.theme}</span>}
                {day.transport && day.transport.length > 0 && (
                  <div className="text-xs text-brand-600 mt-2 pt-2 border-t border-slate-100">
                    Llegada en {day.transport[0].mode}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-6 right-2 z-[400] bg-white/90 backdrop-blur p-3 rounded-lg shadow-md border border-slate-200 text-xs">
        <div className="font-semibold mb-2 text-slate-700 uppercase tracking-wider">Transporte</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-red-500 rounded-full"></div> Tren</div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-blue-500 rounded-full"></div> Autobús</div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-green-500 rounded-full"></div> Vuelo</div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-teal-600 rounded-full"></div> Otro</div>
        </div>
      </div>
    </div>
  );
};
