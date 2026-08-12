import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, ExternalLink, AlertTriangle, Sparkles, CheckCheck, Train, Plane, Hotel, MapPin, Globe } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === 'model';

  // Custom Markdown components tuned for sleek glassmorphism aesthetics
  const markdownComponents = {
    a: ({ href, children, ...props }: any) => {
      const textStr = String(children || '');
      const lower = textStr.toLowerCase() + ' ' + (href || '').toLowerCase();
      
      let Icon = ExternalLink;
      let badgeClass = isModel 
        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500 hover:text-white' 
        : 'bg-white/20 text-white border-white/40 hover:bg-white hover:text-slate-950';

      if (lower.includes('hotel') || lower.includes('booking') || lower.includes('alojamiento') || lower.includes('airbnb') || lower.includes('hostel')) {
        Icon = Hotel;
        badgeClass = isModel 
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-400 hover:text-slate-950 font-medium' 
          : 'bg-amber-400/30 text-amber-100 border-amber-300/50 hover:bg-white hover:text-slate-950 font-medium';
      } else if (lower.includes('tren') || lower.includes('bus') || lower.includes('trainline') || lower.includes('omio') || lower.includes('flixbus') || lower.includes('renfe')) {
        Icon = Train;
        badgeClass = isModel 
          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500 hover:text-white font-medium' 
          : 'bg-sky-400/30 text-sky-100 border-sky-300/50 hover:bg-white hover:text-slate-950 font-medium';
      } else if (lower.includes('vuelo') || lower.includes('skyscanner') || lower.includes('avión') || lower.includes('ryanair') || lower.includes('vueling')) {
        Icon = Plane;
        badgeClass = isModel 
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-400 hover:text-slate-950 font-medium' 
          : 'bg-emerald-400/30 text-emerald-100 border-emerald-300/50 hover:bg-white hover:text-slate-950 font-medium';
      } else if (lower.includes('mapa') || lower.includes('ubicación') || lower.includes('google.com/maps')) {
        Icon = MapPin;
        badgeClass = isModel 
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500 hover:text-white font-medium' 
          : 'bg-rose-400/30 text-rose-100 border-rose-300/50 hover:bg-white hover:text-slate-950 font-medium';
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 my-1 mx-0.5 rounded-xl text-xs border transition-all shadow-sm active:scale-95 ${badgeClass}`}
          {...props}
        >
          <Icon size={13} className="shrink-0" />
          <span className="underline underline-offset-2 decoration-dotted">{children}</span>
          <ExternalLink size={10} className="shrink-0 opacity-80" />
        </a>
      );
    },
    h2: ({ children }: any) => (
      <h2 className="text-xs sm:text-sm font-bold text-white border-b border-slate-700/80 pb-1 mt-3 mb-2 flex items-center gap-1.5 font-heading">
        <Sparkles size={13} className="text-teal-400" />
        <span>{children}</span>
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xs font-bold text-slate-100 mt-2.5 mb-1 flex items-center gap-1 font-heading">
        <span>{children}</span>
      </h3>
    ),
    ul: ({ children }: any) => (
      <ul className="space-y-1.5 my-2 pl-1 text-xs text-slate-200">{children}</ul>
    ),
    li: ({ children }: any) => (
      <li className="flex items-start gap-1.5 leading-relaxed text-slate-200">
        <span className="font-bold shrink-0 mt-0.5 text-teal-400">•</span>
        <span className="flex-1 text-slate-200">{children}</span>
      </li>
    ),
    p: ({ children }: any) => (
      <p className="text-slate-200 mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    strong: ({ children }: any) => (
      <strong className="font-bold text-white">
        {children}
      </strong>
    )
  };

  return (
    <div className={`flex w-full my-2.5 ${isModel ? 'justify-start' : 'justify-end'} animate-fade-in`}>
      <div className={`flex items-start gap-2.5 max-w-[95%] sm:max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar Badge */}
        <div className="shrink-0 mt-0.5">
          {isModel ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-900/40">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-teal-400">
                <Sparkles size={15} />
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg border border-teal-400/40">
              <User size={15} />
            </div>
          )}
        </div>

        {/* Speech Bubble Container */}
        <div 
          className={`flex flex-col rounded-2xl p-3 sm:p-4 shadow-xl text-xs sm:text-sm border transition-all ${
            isModel 
              ? 'bg-slate-900/90 backdrop-blur-md text-slate-100 rounded-tl-xs border-slate-800 shadow-slate-950/80' 
              : 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white rounded-tr-xs border-teal-500/40 shadow-teal-950/40'
          }`}
        >
          {/* Sender Header */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10 text-[11px]">
            <span className="font-bold tracking-wide flex items-center gap-1 text-white font-heading">
              {isModel ? 'Copiloto iTRAVEL_MAP' : 'Tú'}
            </span>
            <span className="text-[10px] opacity-65 font-medium">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Message Content */}
          {message.isError ? (
            <div className="text-rose-300 flex items-center gap-2 text-xs bg-rose-950/70 p-3 rounded-xl border border-rose-800/80">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{message.text}</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-xs max-w-none leading-relaxed text-slate-100">
              <ReactMarkdown components={markdownComponents}>
                {message.text}
              </ReactMarkdown>
            </div>
          )}

          {/* Render Grounding Chunks (Web Search Sources) */}
          {message.groundingChunks && message.groundingChunks.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800">
              <div className="text-[10px] font-bold text-teal-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Globe size={11} />
                <span>Fuentes y Enlaces en Tiempo Real</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.groundingChunks.map((chunk, idx) => (
                  chunk.web && (
                    <a 
                      key={idx} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] bg-slate-950/80 hover:bg-teal-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-xl transition-all border border-slate-800 truncate max-w-[220px] active:scale-95 shadow-sm"
                      title={chunk.web.title}
                    >
                      <ExternalLink size={10} className="shrink-0 text-teal-400" />
                      <span className="truncate">{chunk.web.title}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Double checkmark for user messages */}
          {!isModel && (
            <div className="flex justify-end mt-1 text-emerald-200">
              <CheckCheck size={14} className="opacity-90" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

