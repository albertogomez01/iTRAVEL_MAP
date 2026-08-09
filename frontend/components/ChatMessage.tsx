import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, ExternalLink, AlertTriangle } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex gap-4 p-4 ${isModel ? 'bg-white border-y border-slate-100' : 'bg-slate-50'}`}>
      <div className="flex-shrink-0 mt-1">
        {isModel ? (
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
            <Bot size={18} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
            <User size={18} />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 mb-1">
          {isModel ? 'Copiloto iTRAVEL_MAP' : 'Tú'}
        </div>
        
        {message.isError ? (
          <div className="text-red-500 flex items-center gap-2 text-sm bg-red-50 p-3 rounded-md border border-red-100">
            <AlertTriangle size={16} />
            {message.text}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-slate-700">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}

        {/* Render Grounding Chunks (Sources) */}
        {message.groundingChunks && message.groundingChunks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Fuentes y Datos en Vivo</div>
            <div className="flex flex-wrap gap-2">
              {message.groundingChunks.map((chunk, idx) => (
                chunk.web && (
                  <a 
                    key={idx} 
                    href={chunk.web.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors border border-slate-200 truncate max-w-[250px]"
                    title={chunk.web.title}
                  >
                    <ExternalLink size={12} className="flex-shrink-0" />
                    <span className="truncate">{chunk.web.title}</span>
                  </a>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
