import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';
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
  placeholder = "Buscar ciudad...",
  label,
  iconColor = "text-red-400"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && value.trim().length >= 1) {
      const results = searchCities(value);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
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
    onChange(`${city.name}, ${city.country}`);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-300 mb-1.5">{label}</label>
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
          className="w-full bg-slate-800 border border-slate-700 text-sm rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
        />
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto animate-fade-in">
          {suggestions.map((city, idx) => (
            <button
              key={`${city.name}-${idx}`}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800 text-xs text-white border-b border-slate-800/60 last:border-none transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-400 shrink-0" />
                <span className="font-medium text-white">{city.name}</span>
                <span className="text-[11px] text-slate-400">({city.country})</span>
              </div>
              <Check size={14} className="text-slate-600 hover:text-brand-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
