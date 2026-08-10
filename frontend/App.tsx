import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Link as LinkIcon, Menu, MessageSquare, Map as MapIcon, Calendar, ChevronDown, Bookmark, Sparkles, X } from 'lucide-react';
import { Message, TripPlan, UserPreferences, MapTarget } from './types';
import { initChat, sendMessageToAgent, extractItineraryState, isAdkConfigured, initAdkSession, streamAdkQuery } from './services/aiService';
import { ChatMessage } from './components/ChatMessage';
import { ItineraryView } from './components/ItineraryView';
import { Sidebar, SavedTrip } from './components/Sidebar';
import { MapView } from './components/MapView';
import { LoginModal } from './components/LoginModal';
import { OnboardingGuideModal } from './components/OnboardingGuideModal';
import { AppSplashScreen } from './components/AppSplashScreen';

import { User } from 'firebase/auth';
import { 
  subscribeToAuth, 
  saveUserTripToFirestore, 
  getUserTripsFromFirestore, 
  deleteUserTripFromFirestore 
} from './services/firebase';

interface UserSession {
  displayName: string;
  email: string;
  photoURL?: string;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [userId] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [useAdk, setUseAdk] = useState(false);

  // Trigger Onboarding Guide once when activeUser exists and hasn't seen it yet
  useEffect(() => {
    if (activeUser) {
      const hasSeen = localStorage.getItem('itravel_guide_seen');
      if (!hasSeen) {
        setIsOnboardingOpen(true);
      }
    }
  }, [activeUser]);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    try {
      localStorage.setItem('itravel_guide_seen', 'true');
    } catch (e) {}
  };

  // Floating Overlays & Sidebar Navigation State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);

  // Saved Trips state
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => {
    try {
      const saved = localStorage.getItem('itravel_saved_trips');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setIsLoginModalOpen(false);
        // Sincronización en la nube (Firestore) para la misma cuenta de Google en PC y móvil
        try {
          const remoteTrips = await getUserTripsFromFirestore(currentUser.uid);
          if (remoteTrips && remoteTrips.length > 0) {
            setSavedTrips(prevLocal => {
              const combinedMap = new Map();
              remoteTrips.forEach(t => combinedMap.set(t.id, t));
              prevLocal.forEach(t => {
                if (!combinedMap.has(t.id)) combinedMap.set(t.id, t);
              });
              const merged = Array.from(combinedMap.values()).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
              try {
                localStorage.setItem('itravel_saved_trips', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        } catch (err) {
          console.error("Error sincronizando viajes de la nube:", err);
        }
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
  
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isUpdatingItinerary, setIsUpdatingItinerary] = useState(false);
  const [focusedTarget, setFocusedTarget] = useState<MapTarget | null>(null);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    originLocation: '',
    preferNightTrains: false,
    budgetLevel: 'Standard',
    pace: 'Moderate',
    maxBudget: 1500,
    startDate: '',
    endDate: '',
    tripType: 'RoundTrip'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inicializar chat
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
            text: "¡Hola! Soy tu Copiloto iTRAVEL_MAP. ¿Desde dónde empezarás tu viaje y a dónde te gustaría ir? Abre el menú ☰ arriba a la izquierda para ajustar origen, destino y presupuesto, o escríbeme directamente por aquí."
          }]);
        }
      } catch (error: any) {
        console.error("Error de inicialización:", error);
        setMessages([{
          id: 'error',
          role: 'model',
          text: `⚠️ **Configuración local necesaria**\n\n${error.message}`,
          isError: true
        }]);
      }
    };

    if (!isInitialized) {
      setup();
    }
  }, [userId, isInitialized, preferences]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatOpen]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !isInitialized) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setIsChatOpen(true);

    try {
      if (useAdk && sessionId) {
        const modelMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);
        let fullText = '';
        
        await streamAdkQuery(userId, sessionId, userMsg.text, (chunk) => {
          fullText += chunk;
          setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: fullText } : m));
        });
        
        updateItineraryState([...messages, userMsg, { id: modelMsgId, role: 'model', text: fullText }]);
      } else {
        const response = await sendMessageToAgent(userMsg.text);
        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: response.text || '',
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
        text: `Error: ${error?.message || 'Algo salió mal. Comprueba tu clave API.'}`, 
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

  const handleApplyPreferences = (updatedPrefs: UserPreferences, destination?: string) => {
    if (destination && destination.trim()) {
      const prompt = `Quiero organizar un viaje con origen en ${updatedPrefs.originLocation || 'mi ciudad'} y destino ${destination}. Presupuesto máximo ${updatedPrefs.maxBudget}€.`;
      setInputValue(prompt);
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    }
  };

  // Guardar viaje actual en el historial (Local + Nube Firestore)
  const handleSaveCurrentTrip = async () => {
    const origin = preferences.originLocation || 'Origen';
    const dest = tripPlan?.options?.[0]?.title || 'Viaje Personalizado';
    const newSaved: SavedTrip = {
      id: Date.now().toString(),
      title: dest,
      origin: origin,
      destination: dest,
      dateCreated: new Date().toLocaleDateString('es-ES'),
      preferences: { ...preferences },
      messages: [...messages],
      tripPlan: tripPlan ? { ...tripPlan } : null
    };

    const updated = [newSaved, ...savedTrips.filter(t => t.id !== newSaved.id)];
    setSavedTrips(updated);
    try {
      localStorage.setItem('itravel_saved_trips', JSON.stringify(updated));
    } catch (e) {
      console.error("Error al guardar viaje local:", e);
    }

    if (firebaseUser?.uid) {
      await saveUserTripToFirestore(firebaseUser.uid, newSaved);
    }

    alert("¡Viaje guardado correctamente y sincronizado en tu cuenta de Google!");
  };

  const handleLoadTrip = (saved: SavedTrip) => {
    setPreferences(saved.preferences);
    setMessages(saved.messages);
    setTripPlan(saved.tripPlan);
    if (saved.tripPlan?.options?.[0]?.id) {
      setSelectedOptionId(saved.tripPlan.options[0].id);
    }
    setIsChatOpen(true);
  };

  const handleDeleteTrip = async (tripId: string) => {
    const updated = savedTrips.filter(t => t.id !== tripId);
    setSavedTrips(updated);
    try {
      localStorage.setItem('itravel_saved_trips', JSON.stringify(updated));
    } catch (e) {}

    if (firebaseUser?.uid) {
      await deleteUserTripFromFirestore(firebaseUser.uid, tripId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAskCopilot = (topic: string) => {
    setIsChatOpen(true);
    setIsItineraryOpen(false);
    setInputValue(`¿Me podrías dar más detalles, precios u opiniones sobre ${topic}?`);
  };

  const handleFocusTarget = (target: MapTarget) => {
    setFocusedTarget(target);
    // Optionally minimize itinerary panel on mobile or small screens so user sees map target
    if (window.innerWidth < 768) {
      setIsItineraryOpen(false);
    }
  };

  const selectedOption = tripPlan?.options.find(o => o.id === selectedOptionId) || null;

  return (
    <div className="relative h-screen w-full bg-slate-950 overflow-hidden font-sans select-none">
      
      {/* FLOATING NON-INTRUSIVE AI THINKING INDICATOR */}
      {(isLoading || isUpdatingItinerary) && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/95 text-white backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-brand-500/40 shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <Loader2 size={18} className="animate-spin text-brand-400" />
            <Sparkles size={10} className="absolute text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide">Copiloto IA en acción...</span>
            <span className="text-[10px] text-slate-300">Buscando información en tiempo real y organizando tu viaje</span>
          </div>
        </div>
      )}

      {/* 1. PERMANENT INTERACTIVE MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <MapView 
          option={selectedOption} 
          origin={tripPlan?.origin || preferences.originLocation}
          originCoordinates={tripPlan?.originCoordinates}
          tripType={preferences.tripType || 'RoundTrip'}
          focusedTarget={focusedTarget} 
          onAskCopilot={handleAskCopilot} 
        />
      </div>

      {/* 2. TOP-LEFT HAMBURGER MENU BUTTON */}
      <button 
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed top-2.5 left-2.5 sm:top-4 sm:left-4 z-40 bg-slate-900/90 text-white p-1.5 px-2.5 sm:p-2 sm:px-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-1.5 hover:bg-slate-800 transition-all backdrop-blur-md active:scale-95 cursor-pointer"
        title="Abrir ajustes de viaje y menú"
      >
        <Menu size={18} className="text-brand-400 shrink-0" />
        <img src="/logo.png" alt="Logo" className="w-4 h-4 sm:w-5 sm:h-5 rounded-md object-cover border border-teal-500/40 shrink-0" />
        <span className="font-bold text-[11px] sm:text-xs tracking-wide hidden min-[360px]:inline">iTRAVEL_MAP</span>
      </button>

      {/* 3. TOP-RIGHT FLOATING CONTROLS (TABS & USER) */}
      <div className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 z-40 flex items-center gap-1.5">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1 shadow-2xl flex items-center gap-1">
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (isItineraryOpen) setIsItineraryOpen(false);
            }}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all ${isChatOpen ? 'bg-brand-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <MessageSquare size={13} />
            <span className="inline">Copiloto</span>
          </button>

          <button
            onClick={() => {
              setIsItineraryOpen(!isItineraryOpen);
              if (isChatOpen) setIsChatOpen(false);
            }}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all relative ${isItineraryOpen ? 'bg-brand-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Calendar size={13} />
            <span className="inline">Itinerario</span>
            {tripPlan?.options && tripPlan.options.length > 0 && (
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              setIsChatOpen(false);
              setIsItineraryOpen(false);
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all ${!isChatOpen && !isItineraryOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Ver mapa despejado"
          >
            <MapIcon size={13} />
            <span className="hidden min-[400px]:inline">Mapa</span>
          </button>
        </div>

        {activeUser && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl hidden md:flex items-center gap-2">
            {activeUser.photoURL ? (
              <img src={activeUser.photoURL} alt="" className="w-6 h-6 rounded-full border border-brand-500" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[10px]">
                {activeUser.displayName ? activeUser.displayName[0] : 'U'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. SIDEBAR DRAWER (ORIGIN, DESTINATION AUTOCOMPLETE, SAVED TRIPS) */}
      <Sidebar 
        preferences={preferences} 
        setPreferences={setPreferences} 
        user={activeUser} 
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onApplyPreferences={handleApplyPreferences}
        savedTrips={savedTrips}
        onLoadTrip={handleLoadTrip}
        onDeleteTrip={handleDeleteTrip}
        onSaveCurrentTrip={handleSaveCurrentTrip}
      />

      {/* 5. FLOATING TRANSLUCENT CHAT OVERLAY */}
      {isChatOpen && (
        <div className="fixed inset-x-2 sm:inset-x-4 top-14 sm:top-16 bottom-20 sm:bottom-24 max-w-2xl mx-auto z-20 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-col shadow-2xl animate-fade-in overflow-hidden">
          <div className="p-2 border-b border-slate-800/80 flex justify-between items-center shrink-0 text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-brand-400" />
              <h2 className="font-semibold text-xs sm:text-sm">Copiloto IA (Gemini 3.6 Flash)</h2>
            </div>
            <div className="flex items-center gap-2">
              {isUpdatingItinerary && <Loader2 size={14} className="animate-spin text-brand-400" />}
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (!useAdk || !sessionId) && (
              <div className="p-4 flex gap-3 bg-slate-900/60 rounded-2xl border border-slate-800 my-2">
                <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                  <Loader2 size={16} className="animate-spin" />
                </div>
                <div className="text-xs text-slate-300 mt-1">Buscando las mejores ofertas y procesando respuesta...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* 6. FLOATING TRANSLUCENT ITINERARY OVERLAY */}
      {isItineraryOpen && (
        <div className="fixed inset-x-2 sm:inset-x-4 top-14 sm:top-16 bottom-20 sm:bottom-24 max-w-4xl mx-auto z-20 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-col shadow-2xl animate-fade-in overflow-hidden">
          <div className="p-2 border-b border-slate-800/80 flex justify-between items-center shrink-0 text-white">
            <h2 className="font-semibold text-xs sm:text-sm flex items-center gap-2">
              <Calendar size={15} className="text-brand-400" />
              Itinerarios y Opciones Generadas
            </h2>
            <button 
              onClick={() => setIsItineraryOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ItineraryView 
              tripPlan={tripPlan} 
              isUpdating={isUpdatingItinerary} 
              selectedOptionId={selectedOptionId}
              onSelectOption={setSelectedOptionId}
              onAskCopilot={handleAskCopilot}
              onFocusTarget={handleFocusTarget}
              savedTrips={savedTrips}
              onLoadTrip={handleLoadTrip}
              onDeleteTrip={handleDeleteTrip}
              onSaveCurrentTrip={handleSaveCurrentTrip}
            />
          </div>
        </div>
      )}

      {/* 7. FLOATING BOTTOM CHAT INPUT BAR OVER MAP */}
      <div className="fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[95%] sm:w-[92%] max-w-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-2xl flex items-center gap-2 focus-within:border-brand-500 transition-all">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!isChatOpen) setIsChatOpen(true);
          }}
          placeholder="Escribe a dónde quieres ir o pega una URL..."
          className="w-full max-h-24 min-h-[38px] bg-transparent border-none focus:ring-0 resize-none text-xs sm:text-sm py-1.5 px-2.5 text-white placeholder-slate-400"
          rows={1}
        />
        <div className="flex items-center gap-1">
          <button 
            className="p-1.5 sm:p-2 text-slate-400 hover:text-brand-400 transition-colors rounded-xl hover:bg-slate-800"
            title="Pegar URL"
            onClick={() => {
              setInputValue(prev => prev + ' https://');
              setIsChatOpen(true);
            }}
          >
            <LinkIcon size={17} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isInitialized}
            className="p-2 sm:p-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-500/20 active:scale-95"
          >
            <Send size={17} />
          </button>
        </div>
      </div>

      {/* 8. PROFESSIONAL LOGIN MODAL */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onLoginSuccess={handleLoginSuccess} 
      />

      {/* 9. ONBOARDING WELCOME GUIDE MODAL (SHOWN ONLY ONCE) */}
      <OnboardingGuideModal 
        isOpen={isOnboardingOpen} 
        onClose={handleCloseOnboarding} 
      />

      {/* 10. ANIMATED ENTRY SPLASH SCREEN */}
      {showSplash && (
        <AppSplashScreen onFinish={() => setShowSplash(false)} />
      )}

    </div>
  );
}
