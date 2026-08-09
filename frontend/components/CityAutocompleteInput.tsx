import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check, Loader2, Globe } from 'lucide-react';
import { searchCities, City } from '../data/cities';

interface CityAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  iconColor?: string;
}

export const CityAutocompleteInput: React.FC<CityAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = "Buscar cualquier ciudad del mundo...",
  label,
  iconColor = "text-red-400"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value.trim().length < 1) {
      setSuggestions([]);
      setIsLoadingLive(false);
      return;
    }

    // 1. Instantly show local dataset matches for 0ms response
    const localMatches = searchCities(value);
    setSuggestions(localMatches);

    // 2. Fetch live global geocoding from OpenStreetMap Nominatim for 100% world coverage
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      if (value.trim().length < 2) return;
      setIsLoadingLive(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=6&accept-language=es`
        );
        if (res.ok) {
          const data = await res.json();
          const apiCities: City[] = data.map((item: any) => {
            const cityName = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.name;
            const countryName = item.address?.country || '';
            return {
              name: cityName,
              country: countryName
            };
          }).filter((c: City) => Boolean(c.name));

          // Deduplicate local + API results
          const combined = [...localMatches];
          for (const apiC of apiCities) {
            if (!combined.some(item => item.name.toLowerCase() === apiC.name.toLowerCase())) {
              combined.push(apiC);
            }
          }
          setSuggestions(combined.slice(0, 8));
        }
      } catch (err) {
        console.warn("Geocoding live search:", err);
      } finally {
        setIsLoadingLive(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: City) => {
    const fullLocation = city.country ? `${city.name}, ${city.country}` : city.name;
    onChange(fullLocation);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-brand-400 font-normal flex items-center gap-1">
            <Globe size={11} /> Cobertura Mundial
          </span>
        </label>
      )}
      <div className="relative">
        <MapPin size={16} className={`absolute left-3 top-2.5 ${iconColor}`} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 text-sm rounded-xl pl-9 pr-8 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
        />
        {isLoadingLive && (
          <Loader2 size={14} className="absolute right-3 top-3 text-brand-400 animate-spin" />
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto animate-fade-in">
          {suggestions.map((city, idx) => (
            <button
              key={`${city.name}-${city.country}-${idx}`}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-800 text-xs text-white border-b border-slate-800/60 last:border-none transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin size={14} className="text-brand-400 shrink-0" />
                <span className="font-semibold text-white truncate">{city.name}</span>
                {city.country && (
                  <span className="text-[11px] text-slate-400 truncate">({city.country})</span>
                )}
              </div>
              <Check size={14} className="text-slate-600 hover:text-brand-400 shrink-0 ml-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
