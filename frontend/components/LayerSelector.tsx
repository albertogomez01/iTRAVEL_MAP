import React from 'react';
import { Layers } from 'lucide-react';

type LayerSelectorProps = {
  currentLayer: 'standard' | 'satellite' | 'terrain';
  onChange: (layer: 'standard' | 'satellite' | 'terrain') => void;
};

export const LayerSelector: React.FC<LayerSelectorProps> = ({ currentLayer, onChange }) => {
  const layers: Array<{ id: 'standard' | 'satellite' | 'terrain'; label: string }> = [
    { id: 'standard', label: 'Night' },
    { id: 'terrain', label: 'Urban' },
    { id: 'satellite', label: 'Satellite' },
  ];

  return (
    <div className="absolute top-4 left-4 z-30 flex gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg">
      <Layers size={14} className="text-brand-400 mt-0.5" />
      {layers.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            currentLayer === l.id ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};
