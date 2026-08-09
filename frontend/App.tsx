import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Link as LinkIcon } from 'lucide-react';
import { Message, TripPlan, UserPreferences } from './types';
import { initChat, sendMessageToAgent, extractItineraryState, isAdkConfigured, initAdkSession, streamAdkQuery } from './services/aiService';
import { ChatMessage } from './components/ChatMessage';
import { ItineraryView } from './components/ItineraryView';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';

import { User } from 'firebase/auth';
import { subscribeToAuth } from './services/firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userId] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [useAdk, setUseAdk] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Nuevos estados para manejar las 3 opciones
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isUpdatingItinerary, setIsUpdatingItinerary] = useState(false);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    originLocation: '',
    preferNightTrains: false,
    budgetLevel: 'Standard',
    pace: 'Moderate',
    maxBudget: 1500,
    startDate: '',
    endDate: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inicializar sesión
  useEffect(() => {
    const setup = async () => {
      try {
        if (isAdkConfigured()) {
          try {
            const id = await initAdkSession(userId);
            setSessionId(id);
            setUseAdk(true);
          } catch (error) {
            console.warn("ADK no disponible, usando Gemini estándar:", error);
            setUseAdk(false);
            initChat(preferences);
          }
        } else {
          setUseAdk(false);
          initChat(preferences);
        }
        
        setIsInitialized(true);
        if (messages.length === 0) {
          setMessages([{
            id: 'welcome',
            role: 'model',
            text: "¡Hola! Soy tu Copiloto iTRAVEL_MAP. ¿Desde dónde empezarás tu viaje y a dónde te gustaría ir? Puedes ajustar tu origen, fechas y presupuesto en el panel lateral, o simplemente decírmelo por aquí."
          }]);
        }
      } catch (error: any) {
        console.error("Error de inicialización:", error);
        setMessages([{
          id: 'error',
          role: 'model',
          text: `⚠️ **Configuración Local Necesaria**\n\nEl chat no funciona porque la variable \`process.env.API_KEY\` no existe en tu entorno local.\n\n**Si usas Vite, sigue estos pasos:**\n1. Crea un archivo \`.env\` en la raíz de tu proyecto y añade tu clave: \`VITE_API_KEY=tu_clave_aqui\`\n2. Edita tu archivo \`vite.config.ts\` para inyectar la variable así:\n\`\`\`typescript\nimport { defineConfig, loadEnv } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig(({ mode }) => {\n  const env = loadEnv(mode, process.cwd(), '');\n  return {\n    plugins: [react()],\n    define: {\n      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY)\n    }\n  };\n});\n\`\`\`\n\n*(Detalle técnico: ${error.message})*`,
          isError: true
        }]);
      }
    };

    if (!isInitialized) {
      setup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Re-inicializar chat estándar si cambian las preferencias
  useEffect(() => {
    if (isInitialized && !useAdk) {
      try {
        initChat(preferences);
      } catch (e) {
        console.error("Error al re-inicializar el chat", e);
      }
    }
  }, [preferences, isInitialized, useAdk]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !isInitialized) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (useAdk && sessionId) {
        // Lógica ADK (Streaming)
        const modelMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);
        let fullText = '';
        
        await streamAdkQuery(userId, sessionId, userMsg.text, (chunk) => {
          fullText += chunk;
          setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m));
        });
        
        updateItineraryState([...messages, userMsg, { id: modelMsgId, role: 'model', text: fullText }]);
      } else {
        // Lógica Estándar Original (Funciona con Google Search y Grounding)
        const response = await sendMessageToAgent(userMsg.text);
        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: response.text,
          groundingChunks: response.groundingChunks
        };
        
        setMessages(prev => [...prev, modelMsg]);
        updateItineraryState([...messages, userMsg, modelMsg]);
      }
    } catch (error: any) {
      console.error("Error en el chat:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: `Error: ${error?.message || 'Algo salió mal. Por favor, comprueba tu clave API.'}`, 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isInitialized, sessionId, userId, messages, useAdk]);

  const updateItineraryState = async (currentMessages: Message[]) => {
    setIsUpdatingItinerary(true);
    try {
      const chatHistoryText = currentMessages
        .map(m => `${m.role === 'user' ? 'Usuario' : 'Copiloto'}: ${m.text}`)
        .join('\n\n');
      
      const newPlan = await extractItineraryState(chatHistoryText, preferences);
      if (newPlan && newPlan.options && newPlan.options.length > 0) {
        setTripPlan(newPlan);
        // Si no hay opción seleccionada, o la seleccionada ya no existe, selecciona la primera
        if (!selectedOptionId || !newPlan.options.find(o => o.id === selectedOptionId)) {
          setSelectedOptionId(newPlan.options[0].id);
        }
      }
    } catch (error) {
      console.error("Error al actualizar el itinerario visual", error);
    } finally {
      setIsUpdatingItinerary(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Obtener la opción seleccionada para pasarla al mapa
  const selectedOption = tripPlan?.options.find(o => o.id === selectedOptionId) || null;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar preferences={preferences} setPreferences={setPreferences} user={user} />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Chat Panel */}
        <div className="w-full md:w-1/3 lg:w-[400px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Copiloto</h2>
            {isUpdatingItinerary && <Loader2 size={16} className="animate-spin text-brand-500" />}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (!useAdk || !sessionId) && (
              <div className="p-4 flex gap-4 bg-white">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                  <Loader2 size={18} className="animate-spin" />
                </div>
                <div className="text-sm text-slate-500 mt-1.5">Pensando y buscando datos en vivo...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Planea un viaje a Italia, o pega una URL..."
                className="w-full max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none text-sm py-2 px-2 text-slate-800 placeholder-slate-400"
                rows={1}
              />
              <div className="flex gap-1 pb-1">
                <button 
                  className="p-2 text-slate-400 hover:text-brand-600 transition-colors rounded-lg hover:bg-brand-50"
                  title="Pegar URL para extraer información"
                  onClick={() => setInputValue(prev => prev + ' https://')}
                >
                  <LinkIcon size={18} />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || !isInitialized}
                  className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center mt-2">
              iTRAVEL_MAP puede cometer errores. Verifica los detalles importantes.
            </div>
          </div>
        </div>

        {/* Visual Panels (Map + Itinerary) */}
        <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
          
          {/* Map Section (Top Half) */}
          <div className="h-1/2 border-b border-slate-200 relative z-0 shadow-inner">
            <MapView option={selectedOption} />
          </div>
          
          {/* Itinerary Timeline Section (Bottom Half) */}
          <div className="h-1/2 overflow-hidden relative z-10 bg-slate-50">
            <ItineraryView 
              tripPlan={tripPlan} 
              isUpdating={isUpdatingItinerary} 
              selectedOptionId={selectedOptionId}
              onSelectOption={setSelectedOptionId}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
