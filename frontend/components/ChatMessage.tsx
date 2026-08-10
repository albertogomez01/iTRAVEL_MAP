import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, ExternalLink, AlertTriangle, Sparkles, CheckCheck, Building2, Train, Plane, Hotel, MapPin, Globe } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  // Custom Markdown components to make links and headers look highly visual
  const markdownComponents = {
    a: ({ href, children, ...props }: any) => {
      const textStr = String(children || '');
      const lower = textStr.toLowerCase() + ' ' + (href || '').toLowerCase();
      
      let Icon = ExternalLink;
      let badgeClass = 'bg-brand-500/20 text-brand-300 border-brand-500/40 hover:bg-brand-500 hover:text-white';

      if (lower.includes('hotel') || lower.includes('booking') || lower.includes('alojamiento') || lower.includes('airbnb') || lower.includes('hostel')) {
        Icon = Hotel;
        badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950';
      } else if (lower.includes('tren') || lower.includes('bus') || lower.includes('trainline') || lower.includes('omio') || lower.includes('flixbus') || lower.includes('renfe')) {
        Icon = Train;
        badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500 hover:text-white';
      } else if (lower.includes('vuelo') || lower.includes('skyscanner') || lower.includes('avión') || lower.includes('ryanair') || lower.includes('vueling')) {
        Icon = Plane;
        badgeClass = 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500 hover:text-slate-950';
      } else if (lower.includes('mapa') || lower.includes('ubicación') || lower.includes('google.com/maps')) {
        Icon = MapPin;
        badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500 hover:text-white';
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 my-1 mx-0.5 rounded-xl text-xs font-semibold border transition-all shadow-sm active:scale-95 ${badgeClass}`}
          {...props}
        >
          <Icon size={13} className="shrink-0" />
          <span className="underline underline-offset-2 decoration-dotted">{children}</span>
          <ExternalLink size={10} className="shrink-0 opacity-70" />
        </a>
      );
    },
    h2: ({ children }: any) => (
      <h2 className="text-xs sm:text-sm font-bold text-brand-400 border-b border-slate-800/80 pb-1 mt-3 mb-2 flex items-center gap-1.5">
        <Sparkles size={13} className="text-brand-400" />
        <span>{children}</span>
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xs font-bold text-teal-300 mt-2.5 mb-1 flex items-center gap-1">
        <span>{children}</span>
      </h3>
    ),
    ul: ({ children }: any) => (
      <ul className="space-y-1.5 my-2 pl-1 text-xs">{children}</ul>
    ),
    li: ({ children }: any) => (
      <li className="flex items-start gap-1.5 text-slate-200 leading-relaxed">
        <span className="text-brand-400 font-bold shrink-0 mt-0.5">•</span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-white bg-slate-800/60 px-1 py-0.5 rounded text-[11px] sm:text-xs border border-slate-700/50">
        {children}
      </strong>
    )
  };

  return (
    <div className={`flex w-full my-2.5 ${isModel ? 'justify-start' : 'justify-end'} animate-fade-in`}>
      <div className={`flex items-start gap-2 max-w-[94%] sm:max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar / Icon Badge */}
        <div className="shrink-0 mt-0.5">
          {isModel ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-brand-600 via-teal-500 to-emerald-400 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-brand-300">
                <Sparkles size={15} />
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-md border border-teal-400/40">
              <User size={15} />
            </div>
          )}
        </div>

        {/* Speech Bubble Container */}
        <div 
          className={`flex flex-col rounded-2xl p-3 sm:p-4 shadow-xl text-xs sm:text-sm border transition-all ${
            isModel 
              ? 'bg-slate-900/95 text-slate-100 rounded-tl-xs border-slate-800/90 shadow-slate-950/50 backdrop-blur-md' 
              : 'bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white rounded-tr-xs border-teal-500/40 shadow-teal-950/20'
          }`}
        >
          {/* Sender Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/10 text-[11px]">
            <span className={`font-semibold tracking-wide flex items-center gap-1 ${isModel ? 'text-brand-300' : 'text-teal-100'}`}>
              {isModel ? 'Copiloto iTRAVEL_MAP' : 'Tú'}
            </span>
            <span className="text-[10px] opacity-60">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Message Content */}
          {message.isError ? (
            <div className="text-rose-400 flex items-center gap-2 text-xs bg-rose-950/60 p-3 rounded-xl border border-rose-800/80">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{message.text}</span>
            </div>
          ) : (
            <div className={`prose prose-invert prose-xs max-w-none leading-relaxed ${isModel ? 'text-slate-200' : 'text-white'}`}>
              <ReactMarkdown components={markdownComponents}>
                {message.text}
              </ReactMarkdown>
            </div>
          )}

          {/* Render Grounding Chunks (Web Search Sources) */}
          {message.groundingChunks && message.groundingChunks.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div className="text-[10px] font-bold text-teal-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Globe size={11} />
                <span>Fuentes y Vuelos/Hoteles en Tiempo Real</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.groundingChunks.map((chunk, idx) => (
                  chunk.web && (
                    <a 
                      key={idx} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white px-2 py-1 rounded-lg transition-all border border-slate-700/80 truncate max-w-[220px] active:scale-95 shadow-sm"
                      title={chunk.web.title}
                    >
                      <ExternalLink size={10} className="shrink-0 text-brand-400" />
                      <span className="truncate">{chunk.web.title}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp style double checkmark for user messages */}
          {!isModel && (
            <div className="flex justify-end mt-1 text-teal-200">
              <CheckCheck size={14} className="opacity-80" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
