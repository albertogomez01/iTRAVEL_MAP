import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Link as LinkIcon, Menu, MessageSquare, Map as MapIcon, Calendar, ChevronDown, Bookmark, Sparkles, X, Share2, Check } from 'lucide-react';
import { Message, TripPlan, UserPreferences, MapTarget } from './types';
import { initChat, sendMessageToAgent, extractItineraryState, enrichTripPlanCoordinatesAsync, isAdkConfigured, initAdkSession, streamAdkQuery } from './services/aiService';
import { ChatMessage } from './components/ChatMessage';
import { ItineraryView } from './components/ItineraryView';
import { Sidebar, SavedTrip } from './components/Sidebar';
import { MapView } from './components/MapView';
import { LoginModal } from './components/LoginModal';
import { OnboardingGuideModal } from './components/OnboardingGuideModal';
import { LegalModal, LegalTab } from './components/LegalModal';
import { AppSplashScreen } from './components/AppSplashScreen';
import { UpdateNotifier } from './components/UpdateNotifier';

import { User } from 'firebase/auth';
import { 
  subscribeToAuth, 
  saveUserTripToFirestore, 
  getUserTripsFromFirestore, 
  subscribeToUserTrips,
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
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('about');
  const [userId] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));

  const handleOpenLegalModal = (tab: LegalTab = 'about') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };
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

  const activeTripIdRef = useRef<string | null>(null);
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setIsLoginModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of trips across PC and Phone using Cloud Firestore
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const unsubscribeTrips = subscribeToUserTrips(firebaseUser.uid, (remoteTrips) => {
      if (remoteTrips && remoteTrips.length > 0) {
        setSavedTrips(remoteTrips);
        try {
          localStorage.setItem('itravel_saved_trips', JSON.stringify(remoteTrips));
        } catch (e) {}

        // Automatically load the latest trip on app launch if no trip is currently open
        if (!initialSyncDoneRef.current) {
          initialSyncDoneRef.current = true;
          const latest = remoteTrips[0];
          if (latest && latest.tripPlan) {
            setPreferences(latest.preferences);
            setMessages(latest.messages || []);
            setTripPlan(latest.tripPlan);
            if (latest.tripPlan?.options?.[0]?.id) {
              setSelectedOptionId(latest.tripPlan.options[0].id);
            }
            activeTripIdRef.current = latest.id;
          }
        }
      }
    });

    return () => unsubscribeTrips();
  }, [firebaseUser?.uid]);

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
    tripType: 'RoundTrip',
    passengers: 1
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
        console.warn("Inicialización mediante backend Service Account activada:", error);
        setIsInitialized(true);
        if (messages.length === 0) {
          setMessages([{
            id: 'welcome',
            role: 'model',
            text: "¡Hola! Soy tu Copiloto iTRAVEL_MAP. ¿Desde dónde empezarás tu viaje y a dónde te gustaría ir? Abre el menú ☰ arriba a la izquierda para ajustar origen, destino y presupuesto, o escríbeme directamente por aquí."
          }]);
        }
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

        if (response.tripPlan) {
          const enriched = await enrichTripPlanCoordinatesAsync(response.tripPlan, preferences);
          setTripPlan(enriched);
          if (enriched.options && enriched.options.length > 0) {
            setSelectedOptionId(enriched.options[0].id);
          }
        } else {
          updateItineraryState([...messages, userMsg, modelMsg]);
        }
      }
    } catch (error: any) {
      console.error("Error en el chat:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: `⚠️ **Error en la respuesta**: ${error?.message || 'Ha ocurrido un problema al procesar la solicitud.'}`, 
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

        // Auto-save generated trip to local state and Firestore cloud in real-time
        const tripId = activeTripIdRef.current || Date.now().toString();
        activeTripIdRef.current = tripId;
        const origin = preferences.originLocation || 'Origen';
        const dest = newPlan.options[0]?.title || 'Viaje Personalizado';
        const autoSaved: SavedTrip = {
          id: tripId,
          title: dest,
          origin,
          destination: dest,
          dateCreated: new Date().toLocaleDateString('es-ES'),
          preferences: { ...preferences },
          messages: [...currentMessages],
          tripPlan: { ...newPlan }
        };

        setSavedTrips(prev => {
          const filtered = prev.filter(t => t.id !== autoSaved.id);
          const updated = [autoSaved, ...filtered];
          try {
            localStorage.setItem('itravel_saved_trips', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        if (firebaseUser?.uid) {
          saveUserTripToFirestore(firebaseUser.uid, autoSaved);
        }
      }
    } catch (error) {
      console.error("Error al actualizar el itinerario visual", error);
    } finally {
      setIsUpdatingItinerary(false);
    }
  };

  const handleApplyPreferences = (updatedPrefs: UserPreferences) => {
    setPreferences(updatedPrefs);
    try {
      initChat(updatedPrefs);
    } catch (e) {
      console.warn("Re-inicialización de chat:", e);
    }

    const rawName = activeUser?.displayName || activeUser?.email || 'viajero';
    const userName = rawName.includes('@') ? rawName.split('@')[0] : rawName.split(' ')[0];

    const passengersCount = updatedPrefs.passengers || 1;
    const passengersStr = passengersCount > 1 ? `${passengersCount} personas` : '1 persona';
    const tripTypeStr = updatedPrefs.tripType === 'RoundTrip' ? 'Ida y Vuelta' : 'Solo Ida';
    const datesStr = updatedPrefs.startDate 
      ? (updatedPrefs.endDate ? ` | 📅 Del ${updatedPrefs.startDate} al ${updatedPrefs.endDate}` : ` | 📅 Salida: ${updatedPrefs.startDate}`) 
      : '';
    const originStr = updatedPrefs.originLocation ? `📍 Origen: ${updatedPrefs.originLocation}` : '📍 Origen: No especificado';
    const totalGroupBudget = updatedPrefs.maxBudget * passengersCount;

    const userMsgText = `⚙️ **Preferencias de viaje aplicadas**:\n- ${originStr}\n- 👥 Viajeros: ${passengersStr}\n- 🔄 Tipo: ${tripTypeStr}${datesStr}\n- 💶 Presupuesto: ${updatedPrefs.maxBudget}€ / pers. (Total grupo: ${totalGroupBudget}€)`;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText
    };

    const copilotText = `Con estos datos, ¿a dónde quieres ir, **${userName}**? 🗺️✨`;

    const modelMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: copilotText
    };

    setMessages(prev => [...prev, userMsg, modelMsg]);
    setIsChatOpen(true);
    setIsItineraryOpen(false);
  };

  // Guardar viaje actual en el historial (Local + Nube Firestore)
  const handleSaveCurrentTrip = async () => {
    const origin = preferences.originLocation || 'Origen';
    const dest = tripPlan?.options?.[0]?.title || 'Viaje Personalizado';
    const tripId = activeTripIdRef.current || Date.now().toString();
    activeTripIdRef.current = tripId;

    const newSaved: SavedTrip = {
      id: tripId,
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
    activeTripIdRef.current = saved.id;
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

  const [isCopied, setIsCopied] = useState(false);

  const handleShareApp = async () => {
    const shareData = {
      title: 'iTRAVEL_MAP - Tu Copiloto de Viajes con IA',
      text: 'Planifica tus viajes paso a paso con iTRAVEL_MAP: itinerarios inteligentes, transportes y rutas interactivas en mapa.',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const selectedOption = tripPlan?.options?.find(o => o.id === selectedOptionId) || tripPlan?.options?.[0] || null;

  return (
    <div className="relative h-screen w-full bg-slate-950 text-slate-100 font-sans select-none flex flex-col overflow-hidden">
      
      {/* FLOATING AI THINKING INDICATOR */}
      {(isLoading || isUpdatingItinerary) && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/95 text-white backdrop-blur-xl px-4 py-2 rounded-2xl border border-teal-500/40 shadow-2xl flex items-center gap-3 animate-fade-in max-w-[90vw]">
          <div className="relative flex items-center justify-center shrink-0">
            <Loader2 size={16} className="animate-spin text-teal-400" />
            <Sparkles size={9} className="absolute text-emerald-400" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-white tracking-wide truncate">Copiloto IA pensando...</span>
            <span className="text-[10px] text-slate-300 truncate">Organizando el itinerario y buscando precios</span>
          </div>
        </div>
      )}

      {/* 1. MASTER TOP NAVIGATION HEADER */}
      <header className="h-14 sm:h-16 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 shrink-0 z-40 px-3 sm:px-5 flex items-center justify-between gap-2">
        
        {/* Left: Brand Logo & Sidebar Toggle */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Abrir menú y ajustes de viaje"
          >
            <Menu size={18} className="text-teal-400 shrink-0" />
            <span className="text-xs font-bold text-slate-300 hidden md:inline">Ajustes</span>
          </button>

          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsMobileSidebarOpen(true)}>
            <div className="relative flex items-center justify-center">
              <img src="/logo.png" alt="iTRAVEL_MAP Logo" style={{ maxWidth: '32px', maxHeight: '32px' }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover shadow-lg border border-teal-500/40 group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-xs sm:text-sm tracking-wide text-white font-heading group-hover:text-teal-300 transition-colors">iTRAVEL_MAP</span>
              <span className="text-[9px] font-bold text-teal-400 tracking-wider uppercase">Copiloto IA</span>
            </div>
          </div>
        </div>

        {/* Center: Trip Status Badge (Origin & Destination Context) */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-inner text-xs">
          <span className="text-slate-400 font-medium">Viaje:</span>
          <span className="font-bold text-white flex items-center gap-1">
            📍 {preferences.originLocation || 'Origen sin definir'}
          </span>
          <span className="text-teal-400 font-bold">➔</span>
          <span className="font-bold text-teal-300">
            {tripPlan?.options?.[0]?.title ? tripPlan.options[0].title : 'Escribe tu destino'}
          </span>
          <span className="text-slate-500 text-[11px] px-1.5 py-0.5 bg-slate-950 rounded-lg border border-slate-800">
            {preferences.maxBudget}€/pers
          </span>
        </div>

        {/* Right: Segmented Workspace View Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-2xl flex items-center gap-1 shadow-lg">
            <button
              onClick={() => {
                setIsChatOpen(false);
                setIsItineraryOpen(false);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${!isChatOpen && !isItineraryOpen ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:text-white'}`}
              title="Vista de Mapa Completo"
            >
              <MapIcon size={14} className="text-teal-400" />
              <span className="hidden min-[480px]:inline">Mapa</span>
            </button>

            <button
              onClick={() => {
                setIsChatOpen(true);
                setIsItineraryOpen(false);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${isChatOpen ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40' : 'text-slate-300 hover:text-white'}`}
              title="Copiloto IA Chat"
            >
              <MessageSquare size={14} />
              <span>Copiloto</span>
            </button>

            <button
              onClick={() => {
                setIsItineraryOpen(true);
                setIsChatOpen(false);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all relative ${isItineraryOpen ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40' : 'text-slate-300 hover:text-white'}`}
              title="Itinerarios Generados"
            >
              <Calendar size={14} />
              <span>Ruta</span>
              {tripPlan?.options && tripPlan.options.length > 0 && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              )}
            </button>
          </div>

          <button
            onClick={handleShareApp}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-800 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-slate-900/90 text-slate-300 hover:text-white'}`}
            title="Compartir enlace de la aplicación"
          >
            {isCopied ? <Check size={15} className="text-emerald-300" /> : <Share2 size={15} />}
            <span className="hidden sm:inline">{isCopied ? '¡Copiado!' : 'Compartir'}</span>
          </button>

          {activeUser && (
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl hidden sm:flex items-center gap-1.5">
              {activeUser.photoURL ? (
                <img src={activeUser.photoURL} alt="" className="w-7 h-7 rounded-xl border border-teal-500" />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                  {activeUser.displayName ? activeUser.displayName[0] : 'U'}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 2. WORKSPACE BODY AREA (MAP + UNIFIED DOCK PANEL) */}
      <div className="relative flex-1 flex flex-row overflow-hidden w-full">
        
        {/* PERMANENT SIDEBAR DRAWER */}
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
          onOpenLegalModal={handleOpenLegalModal}
        />

        {/* MAP VIEW CONTAINER */}
        <div className="relative flex-1 h-full overflow-hidden z-0">
          <MapView 
            option={selectedOption} 
            origin={tripPlan?.origin || preferences.originLocation}
            originCoordinates={tripPlan?.originCoordinates}
            tripType={preferences.tripType || 'RoundTrip'}
            focusedTarget={focusedTarget} 
            onAskCopilot={handleAskCopilot} 
          />

          {/* FLOATING 3 TRIP OPTIONS SELECTOR BAR OVER MAP */}
          {tripPlan?.options && tripPlan.options.length > 0 && (!isChatOpen && !isItineraryOpen) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-[94vw] sm:max-w-2xl w-auto animate-fade-in">
              <div className="bg-slate-900/95 text-white backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest px-2 shrink-0 hidden min-[550px]:inline">
                  Opción:
                </span>
                {tripPlan.options.map((opt, index) => {
                  const isSelected = (selectedOptionId ? opt.id === selectedOptionId : index === 0);
                  const badgeBg = index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-sky-500' : 'bg-purple-500';
                  const labelText = index === 0 ? 'Económica' : index === 1 ? 'Equilibrada' : 'Rápida';
                  
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-800 text-white border border-teal-500/70 shadow-lg ring-2 ring-teal-500/30 scale-105' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                      }`}
                      title={`${opt.title} - ${opt.estimatedBudget}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${badgeBg} shrink-0 shadow-sm`} />
                      <span className="font-bold text-white whitespace-nowrap text-xs font-heading">
                        {`Opc. ${index + 1}: ${labelText}`}
                      </span>
                      <span className="text-[10px] font-bold text-teal-300 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 whitespace-nowrap">
                        {opt.estimatedBudget}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. UNIFIED COPILOT & ITINERARY DOCK PANEL */}
        {(isChatOpen || isItineraryOpen) && (
          <aside className="fixed inset-x-2 bottom-2 top-auto h-[60vh] max-h-[540px] z-30 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 flex flex-col transition-all duration-300 shadow-2xl rounded-3xl lg:relative lg:inset-auto lg:h-full lg:max-h-none lg:w-[460px] xl:w-[520px] lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:shrink-0">
            
            {/* Dock Header with Tabs & Controls */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => {
                    setIsChatOpen(true);
                    setIsItineraryOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isChatOpen ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <Sparkles size={14} className="text-teal-300" />
                  <span>Copiloto IA</span>
                </button>

                <button
                  onClick={() => {
                    setIsItineraryOpen(true);
                    setIsChatOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isItineraryOpen ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <Calendar size={14} />
                  <span>Itinerario</span>
                  {tripPlan?.options && tripPlan.options.length > 0 && (
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsChatOpen(false);
                    setIsItineraryOpen(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Cerrar panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Dock Body Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              
              {/* TAB 1: COPILOT CHAT STREAM + INTEGRATED INPUT */}
              {isChatOpen && (
                <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4">
                  <div className="flex-1 overflow-y-auto pr-1">
                    {messages.map(msg => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                    {isLoading && (!useAdk || !sessionId) && (
                      <div className="p-4 flex gap-3 bg-slate-900/60 rounded-2xl border border-slate-800 my-2">
                        <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                          <Loader2 size={16} className="animate-spin" />
                        </div>
                        <div className="text-xs text-slate-300 mt-1">Buscando las mejores ofertas y procesando respuesta...</div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* INTEGRATED INPUT PROMPT BAR AT BOTTOM OF CHAT */}
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    <div className="bg-slate-900 border border-slate-800 focus-within:border-teal-500 rounded-2xl p-2 shadow-xl flex items-center gap-2 transition-colors">
                      <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe a dónde quieres ir o haz una pregunta..."
                        className="w-full max-h-24 min-h-[38px] bg-transparent border-none focus:ring-0 resize-none text-xs sm:text-sm py-1 px-2 text-white placeholder-slate-500"
                        rows={1}
                      />
                      <button 
                        className="p-2 text-slate-400 hover:text-teal-400 transition-colors rounded-xl hover:bg-slate-800 shrink-0"
                        title="Pegar enlace"
                        onClick={() => setInputValue(prev => prev + ' https://')}
                      >
                        <LinkIcon size={16} />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading || !isInitialized}
                        className="p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-teal-900/40 shrink-0 active:scale-95"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ITINERARIES & OPTIONS VIEW */}
              {isItineraryOpen && (
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
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
              )}

            </div>
          </aside>
        )}

      </div>

      {/* 4. SYSTEM MODALS */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onLoginSuccess={handleLoginSuccess} 
      />

      <OnboardingGuideModal 
        isOpen={isOnboardingOpen} 
        onClose={handleCloseOnboarding} 
      />

      <LegalModal 
        isOpen={isLegalModalOpen} 
        initialTab={legalModalTab} 
        onClose={() => setIsLegalModalOpen(false)} 
      />

      {showSplash && (
        <AppSplashScreen onFinish={() => setShowSplash(false)} />
      )}

    </div>
  );
}
