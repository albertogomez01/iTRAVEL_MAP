import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Link as LinkIcon, Menu, MessageSquare, Map as MapIcon, Calendar } from 'lucide-react';
import { Message, TripPlan, UserPreferences } from './types';
import { initChat, sendMessageToAgent, extractItineraryState, isAdkConfigured, initAdkSession, streamAdkQuery } from './services/aiService';
import { ChatMessage } from './components/ChatMessage';
import { ItineraryView } from './components/ItineraryView';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { LoginModal } from './components/LoginModal';

import { User } from 'firebase/auth';
import { subscribeToAuth } from './services/firebase';

interface UserSession {
  displayName: string;
  email: string;
  photoURL?: string;
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [customUser, setCustomUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('itravel_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const activeUser = firebaseUser ? {
    displayName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || undefined
  } : customUser;

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(!activeUser);

  const [userId] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [useAdk, setUseAdk] = useState(false);

  // Responsive mobile states
  const [mobileTab, setMobileTab] = useState<'chat' | 'map' | 'itinerary'>('chat');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setIsLoginModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (userData: UserSession) => {
    setCustomUser(userData);
    try {
      localStorage.setItem('itravel_user_session', JSON.stringify(userData));
    } catch (e) {
      console.warn("No se pudo guardar la sesión local:", e);
    }
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setCustomUser(null);
    try {
      localStorage.removeItem('itravel_user_session');
    } catch (e) {}
    setIsLoginModalOpen(true);
  };
  
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
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* Mobile Top Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0 z-20">
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800 transition-colors"
          title="Abrir menú y filtros"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
          <span className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center text-xs font-black shadow-sm">iT</span>
          iTRAVEL_MAP
        </div>
        {user ? (
          <img src={user.photoURL || ''} alt="" className="w-7 h-7 rounded-full border border-brand-500 shadow-sm" />
        ) : (
          <div className="w-7 text-[10px] text-brand-400 font-semibold bg-brand-950 px-1.5 py-0.5 rounded border border-brand-800">PRO</div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar Navigation */}
        <Sidebar 
          preferences={preferences} 
          setPreferences={setPreferences} 
          user={activeUser} 
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onLogout={handleLogout}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full relative">
          
          {/* Chat Panel */}
          <div className={`w-full md:w-1/3 lg:w-[400px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-sm h-full ${mobileTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-3 md:p-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex justify-between items-center shrink-0">
              <h2 className="font-semibold text-slate-800 text-sm md:text-base">Copiloto</h2>
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

            <div className="p-3 md:p-4 bg-white border-t border-slate-100 shrink-0">
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

          {/* Visual Panels Container (Map + Itinerary) */}
          <div className={`flex-1 flex-col bg-slate-50/50 relative overflow-hidden h-full ${mobileTab !== 'chat' ? 'flex' : 'hidden md:flex'}`}>
            
            {/* Map Section */}
            <div className={`border-b border-slate-200 relative z-0 shadow-inner ${mobileTab === 'map' ? 'h-full' : mobileTab === 'itinerary' ? 'hidden md:block md:h-1/2' : 'h-1/2'}`}>
              <MapView option={selectedOption} />
            </div>
            
            {/* Itinerary Timeline Section */}
            <div className={`overflow-hidden relative z-10 bg-slate-50 ${mobileTab === 'itinerary' ? 'h-full' : mobileTab === 'map' ? 'hidden md:block md:h-1/2' : 'h-1/2'}`}>
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

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex border-t border-slate-200 bg-white/95 backdrop-blur-md shrink-0 shadow-lg z-30">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 flex flex-col items-center justify-center text-xs font-medium transition-colors ${mobileTab === 'chat' ? 'text-brand-600 font-bold border-t-2 border-brand-500 bg-brand-50/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <MessageSquare size={18} />
          <span className="mt-0.5 text-[11px]">Copiloto</span>
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 flex flex-col items-center justify-center text-xs font-medium transition-colors ${mobileTab === 'map' ? 'text-brand-600 font-bold border-t-2 border-brand-500 bg-brand-50/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <MapIcon size={18} />
          <span className="mt-0.5 text-[11px]">Mapa</span>
        </button>
        <button
          onClick={() => setMobileTab('itinerary')}
          className={`flex-1 py-2 flex flex-col items-center justify-center text-xs font-medium transition-colors relative ${mobileTab === 'itinerary' ? 'text-brand-600 font-bold border-t-2 border-brand-500 bg-brand-50/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar size={18} />
          <span className="mt-0.5 text-[11px]">Itinerario</span>
          {tripPlan?.options && tripPlan.options.length > 0 && (
            <span className="absolute top-1.5 right-1/4 w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Professional Web App Welcome / Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onLoginSuccess={handleLoginSuccess} 
      />

    </div>
  );
}
