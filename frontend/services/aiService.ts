import { GoogleGenAI, Type, Chat, Modality } from '@google/genai';
import { TripPlan, UserPreferences } from '../types';

// ============================================================================
// 1. STANDARD GEMINI API
// ============================================================================

export const getApiKey = (): string => {
  const customKey = typeof localStorage !== 'undefined' ? localStorage.getItem('CUSTOM_GEMINI_API_KEY') : null;
  if (customKey && customKey.trim() && customKey.trim().length > 10) {
    return customKey.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY.trim();
    if (envKey && envKey.length > 10) {
      return envKey;
    }
  }
  if (typeof process !== 'undefined' && process.env?.API_KEY && process.env.API_KEY !== 'api-key-this-is-not-used-can-be-ignored!') {
    return process.env.API_KEY.trim();
  }
  return '';
};

export const setCustomApiKey = (key: string) => {
  localStorage.setItem('CUSTOM_GEMINI_API_KEY', key);
  initAiClient();
};

let ai: GoogleGenAI | null = null;

export const initAiClient = (): GoogleGenAI => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la API Key de Gemini. Añade VITE_GEMINI_API_KEY en tu .env o configura tu clave en la app.");
  }
  
  // Las claves de Google AI Studio empiezan por AIzaSy... (vertexai: false)
  // Las claves de Vertex AI / GCP empiezan por AQ... u otras (vertexai: true)
  const isVertex = !apiKey.startsWith('AIza');
  ai = new GoogleGenAI({ apiKey, vertexai: isVertex });
  return ai;
};

try {
  initAiClient();
} catch (e) {
  console.warn("Inicialización inicial de GoogleGenAI pospuesta hasta que se configure la API Key.");
}

const MODEL_NAME = 'gemini-2.0-flash';
let chatSession: Chat | null = null;



const SYSTEM_INSTRUCTION = `
Eres iTRAVEL_MAP, el copilot y planificador experto inteligente integrado en la plataforma iTRAVEL_MAP.

¿Qué es iTRAVEL_MAP y qué hace esta aplicación?
Si el usuario te pregunta quién eres, qué puedes hacer o cómo funciona iTRAVEL_MAP, responde de forma entusiasta, organizada y clara explicando las siguientes características de la aplicación:

1. 🗺️ **Planificación Multimodal Inteligente**: Diseñas rutas personalizadas paso a paso combinando trenes (Interrail, Eurostar, Alta Velocidad), autobuses de larga distancia (FlixBus, Alsa) y vuelos (Skyscanner, Ryanair, Vueling).
2. ⚡ **3 Opciones de Itinerario**: Para cualquier destino o sugerencia, generas automáticamente 3 alternativas distintas:
   - **Opción Económica**: Prioriza el ahorro y transportes asequibles.
   - **Opción Equilibrada**: Equilibra coste, confort y tiempo de trayecto.
   - **Opción Rápida / Premium**: Prioriza conexiones directas y máxima comodidad.
3. 📍 **Mapa Interactivo Leaflet & Coordenadas Reales**: Todas las rutas propuestas se sincronizan visualmente con el mapa interactivo, dibujando las trayectorias entre ciudades y ubicando marcadores para cada día.
4. 🛌 **Optimizador de Noches y Alojamientos**: Recomiendas hoteles, hostales o trenes/autobuses nocturnos para ahorrar noches de alojamiento.
5. 🏛️ **Puntos de Interés (POIs) y Actividades**: Recomiendas monumentos, museos, senderos naturales y gastronomía local con consejos prácticos para cada día.
6. ⚙️ **Filtros y Preferencias en Tiempo Real**: El usuario puede configurar en el panel lateral su origen, rango de fechas, presupuesto máximo (€), ritmo (Relajado, Moderado, Intenso) y prioridad de transportes nocturnos.
7. 🚩 **Ciudad de Origen**: La ciudad de origen sirve exclusivamente para calcular y dibujar las rutas de transporte. NUNCA recomiendes hoteles, puntos de interés ni actividades para la ciudad de origen. Toda la información del itinerario debe enfocarse en las ciudades de destino.
8. 💾 **Guardado y Sincronización en la Nube**: Integración con autenticación Google y Firebase para guardar viajes y reanudarlos en cualquier momento.
9. 🔍 **Búsqueda Mundial de Ciudades**: Autocompletado rápido de ciudades de todo el mundo mediante OpenStreetMap Nominatim.

Reglas de Interacción y Formato Visual:
- **Idioma**: SIEMPRE en español de España (es-ES).
- **Origen del viaje**: Si el usuario no ha especificado desde qué ciudad sale, pregúntale amablemente en tu primer mensaje.
- **Enlaces a Hoteles y Trayectos OBLIGATORIOS**: Incluye SIEMPRE enlaces markdown formato '[🏨 Nombre del Hotel / Booking](url)' para alojamientos recomendados y '[🚆 Ver billetes Tren/Avión en Skyscanner/Omio](url)' para trayectos.
  - Para hoteles/alojamientos usa enlaces como: https://www.booking.com/searchresults.es.html?ss=NombreCiudad o https://www.airbnb.es/s/NombreCiudad.
  - Para transportes usa enlaces como: https://www.thetrainline.com, https://www.omio.es, https://www.skyscanner.es, https://www.flixbus.es.
- **Diseño Visual**: Usa emojis explicativos (🏨, 🚆, ✈️, 🚌, 📍, 💶, 💡), listas estructuradas con viñetas, precios estimados en € y resaltados en negrita.
- **Tono**: Profesional, motivador, muy estructurado y conciso.
`;

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash'
];

let activeModelIndex = 0;
let lastPreferences: UserPreferences | null = null;

const CACHE_VERSION = 'cache_v1';

// In-memory & LocalStorage Caches to minimize Gemini API calls & GCP costs
const chatResponseCache = new Map<string, { text: string; groundingChunks?: any[] }>();
const itineraryStateCache = new Map<string, TripPlan>();

const getCacheKey = (prompt: string, prefs?: UserPreferences | null): string => {
  const normPrompt = prompt.trim().toLowerCase();
  const prefStr = prefs ? `${prefs.originLocation}_${prefs.maxBudget}_${prefs.passengers}_${prefs.tripType}_${prefs.pace}` : '';
  return `${CACHE_VERSION}___${normPrompt}___${prefStr}`;
};

export const initChat = (preferences: UserPreferences) => {
  lastPreferences = preferences;
  try {
    if (!ai) {
      ai = initAiClient();
    }
    if (ai) {
      const currentModel = CANDIDATE_MODELS[activeModelIndex] || CANDIDATE_MODELS[0];
      chatSession = ai.chats.create({
        model: currentModel,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      });
    }
  } catch (e) {
    console.log("Chat configurado para usar Backend Service Account (/api/chat)");
  }
};

export const sendMessageToAgent = async (message: string) => {
  const cacheKey = getCacheKey(message, lastPreferences);
  if (chatResponseCache.has(cacheKey)) {
    console.log("⚡ Respuesta de chat servida desde la caché (0 tokens GCP consumidos)");
    return chatResponseCache.get(cacheKey)!;
  }

  // 1. Intentar backend oficial con Service Account (Google Cloud Vertex AI)
  try {
    const apiRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        preferences: lastPreferences
      })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.text) {
        console.log("🔒 Respuesta obtenida mediante Google Cloud Service Account Backend (/api/chat)");
        const result = {
          text: data.text,
          groundingChunks: data.groundingChunks || []
        };
        chatResponseCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (backendError) {
    console.warn("Backend Service Account API no disponible, usando fallback cliente:", backendError);
  }

  if (!ai || !chatSession) throw new Error("Sesión de chat no inicializada");

  for (let attempt = 0; attempt < CANDIDATE_MODELS.length; attempt++) {
    try {
      const response = await chatSession.sendMessage({ message });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const result = {
        text: response.text,
        groundingChunks: groundingChunks.map((chunk: any) => ({
          web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined
        })).filter((c: any) => c.web !== undefined)
      };

      chatResponseCache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      const errMsg = String(error?.message || error);
      console.warn(`Error con modelo ${CANDIDATE_MODELS[activeModelIndex]} (${errMsg}). Probando siguiente modelo...`);
      
      activeModelIndex = (activeModelIndex + 1) % CANDIDATE_MODELS.length;
      if (lastPreferences) {
        initChat(lastPreferences);
      } else {
        chatSession = ai.chats.create({
          model: CANDIDATE_MODELS[activeModelIndex],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        });
      }
      
      // If we cycled through all models, throw the last error
      if (attempt === CANDIDATE_MODELS.length - 1) {
        throw error;
      }
    }
  }

  throw new Error("No se pudo obtener respuesta de ningún modelo de Gemini disponible.");
};

// Schema for the Orchestrator to extract structured data
const tripPlanSchema = {
  type: Type.OBJECT,
  properties: {
    origin: { type: Type.STRING, description: "Ciudad y país de origen del viaje (ej. 'Madrid, España'). Si no se sabe, pon 'Por definir'." },
    originCoordinates: {
      type: Type.OBJECT,
      description: "Latitud y longitud de la ciudad de origen",
      properties: {
        lat: { type: Type.NUMBER },
        lng: { type: Type.NUMBER }
      }
    },
    options: {
      type: Type.ARRAY,
      description: "EXACTAMENTE 3 opciones de itinerario basadas en la conversación (ej. Económica, Equilibrada, Rápida).",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Identificador único corto, ej. 'opt1'" },
          title: { type: Type.STRING, description: "Título de la opción (ej. 'Ruta Económica en Bus')" },
          summary: { type: Type.STRING, description: "Breve resumen de esta opción" },
          totalDuration: { type: Type.STRING, description: "Duración total (ej. '7 días')" },
          estimatedBudget: { type: Type.STRING, description: "Presupuesto estimado (ej. '350€')" },
          bookingLinks: {
            type: Type.ARRAY,
            description: "Enlaces útiles para reservar transportes o alojamientos de esta ruta",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nombre del servicio (ej. 'FlixBus', 'Renfe')" },
                url: { type: Type.STRING, description: "URL del servicio" },
                type: { type: Type.STRING, description: "Transport, Accommodation, Activity, Other" }
              },
              required: ["name", "url", "type"]
            }
          },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayNumber: { type: Type.INTEGER },
                location: { type: Type.STRING, description: "Ciudad o región principal del día" },
                coordinates: {
                  type: Type.OBJECT,
                  description: "Latitud y longitud de la ubicación",
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER }
                  },
                  required: ["lat", "lng"]
                },
                theme: { type: Type.STRING, description: "Ej. 'Llegada y Exploración', 'Museos' (en español)" },
                transport: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      mode: { type: Type.STRING, description: "Train, Bus, Flight, Ferry, Walk (Mantener estos valores exactos en inglés para los iconos)" },
                      provider: { type: Type.STRING, description: "Ej. Eurostar, FlixBus, Ryanair" },
                      from: { type: Type.STRING },
                      to: { type: Type.STRING },
                      duration: { type: Type.STRING, description: "Duración exacta del trayecto (ej. '2h 30m')" },
                      requiresReservation: { type: Type.BOOLEAN },
                      notes: { type: Type.STRING, description: "Notas en español" }
                    },
                    required: ["mode", "from", "to", "requiresReservation"]
                  }
                },
                accommodation: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "Hotel, Hostel, Night Train, Night Bus (Mantener estos valores exactos en inglés)" },
                    name: { type: Type.STRING },
                    location: { type: Type.STRING },
                    notes: { type: Type.STRING, description: "Notas en español" },
                    coordinates: {
                      type: Type.OBJECT,
                      description: "Latitud y longitud del hotel",
                      properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER }
                      }
                    }
                  },
                  required: ["type", "name", "location"]
                },
                pois: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING, description: "Monument, Restaurant, Nature, Museum, Other (Mantener estos valores exactos en inglés)" },
                      description: { type: Type.STRING, description: "Descripción en español" },
                      tips: { type: Type.STRING, description: "Consejos en español" },
                      coordinates: {
                        type: Type.OBJECT,
                        description: "Latitud y longitud del punto de interés",
                        properties: {
                          lat: { type: Type.NUMBER },
                          lng: { type: Type.NUMBER }
                        }
                      }
                    },
                    required: ["name", "category", "description"]
                  }
                }
              },
              required: ["dayNumber", "location", "coordinates", "transport", "pois"]
            }
          }
        },
        required: ["id", "title", "summary", "totalDuration", "estimatedBudget", "bookingLinks", "days"]
      }
    }
  },
  required: ["origin", "options"]
};

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // España
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'sevilla': { lat: 37.3891, lng: -5.9845 },
  'valencia': { lat: 39.4699, lng: -0.3763 },
  'alicante': { lat: 38.3452, lng: -0.4810 },
  'alacant': { lat: 38.3452, lng: -0.4810 },
  'málaga': { lat: 36.7213, lng: -4.4214 },
  'malaga': { lat: 36.7213, lng: -4.4214 },
  'bilbao': { lat: 43.2630, lng: -2.9350 },
  'zaragoza': { lat: 41.6488, lng: -0.8891 },
  'granada': { lat: 37.1773, lng: -3.5986 },
  'córdoba': { lat: 37.8882, lng: -4.7794 },
  'cordoba': { lat: 37.8882, lng: -4.7794 },
  'palma': { lat: 39.5696, lng: 2.6502 },
  'palma de mallorca': { lat: 39.5696, lng: 2.6502 },
  'san sebastián': { lat: 43.3183, lng: -1.9812 },
  'san sebastian': { lat: 43.3183, lng: -1.9812 },
  'oviedo': { lat: 43.3619, lng: -5.8494 },
  'santander': { lat: 43.4623, lng: -3.8099 },
  'santiago de compostela': { lat: 42.8782, lng: -8.5448 },
  'vigo': { lat: 42.2406, lng: -8.7207 },
  'a coruña': { lat: 43.3623, lng: -8.4115 },
  'cadiz': { lat: 36.5271, lng: -6.2886 },
  'cádiz': { lat: 36.5271, lng: -6.2886 },
  
  // Italia
  'roma': { lat: 41.9028, lng: 12.4964 },
  'venecia': { lat: 45.4408, lng: 12.3155 },
  'venezia': { lat: 45.4408, lng: 12.3155 },
  'florencia': { lat: 43.7696, lng: 11.2558 },
  'firenze': { lat: 43.7696, lng: 11.2558 },
  'milán': { lat: 45.4642, lng: 9.1900 },
  'milan': { lat: 45.4642, lng: 9.1900 },
  'nápoles': { lat: 40.8518, lng: 14.2681 },
  'napoli': { lat: 40.8518, lng: 14.2681 },
  'bolonia': { lat: 44.4949, lng: 11.3426 },
  'bologna': { lat: 44.4949, lng: 11.3426 },
  'turín': { lat: 45.0703, lng: 7.6869 },
  'verona': { lat: 45.4384, lng: 10.9916 },
  'pisa': { lat: 43.7228, lng: 10.4017 },
  'génova': { lat: 44.4056, lng: 8.9463 },
  'genova': { lat: 44.4056, lng: 8.9463 },

  // Francia
  'parís': { lat: 48.8566, lng: 2.3522 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'niza': { lat: 43.7102, lng: 7.2620 },
  'nice': { lat: 43.7102, lng: 7.2620 },
  'marsella': { lat: 43.2965, lng: 5.3698 },
  'marseille': { lat: 43.2965, lng: 5.3698 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'burdeos': { lat: 44.8378, lng: -0.5792 },
  'bordeaux': { lat: 44.8378, lng: -0.5792 },
  'estrasburgo': { lat: 48.5734, lng: 7.7521 },

  // Portugal & Reino Unido
  'lisboa': { lat: 38.7223, lng: -9.1393 },
  'porto': { lat: 41.1579, lng: -8.6291 },
  'oporto': { lat: 41.1579, lng: -8.6291 },
  'londres': { lat: 51.5074, lng: -0.1278 },
  'edimburgo': { lat: 55.9533, lng: -3.1883 },
  'mánchester': { lat: 53.4808, lng: -2.2426 },
  'dublín': { lat: 53.3498, lng: -6.2603 },
  'dublin': { lat: 53.3498, lng: -6.2603 },

  // Europa Central & Este
  'berlín': { lat: 52.5200, lng: 13.4050 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'múnich': { lat: 48.1351, lng: 11.5820 },
  'munich': { lat: 48.1351, lng: 11.5820 },
  'fráncfort': { lat: 50.1109, lng: 8.6821 },
  'frankfurt': { lat: 50.1109, lng: 8.6821 },
  'ámsterdam': { lat: 52.3676, lng: 4.9041 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'bruselas': { lat: 50.8503, lng: 4.3517 },
  'brussels': { lat: 50.8503, lng: 4.3517 },
  'viena': { lat: 48.2082, lng: 16.3738 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'praga': { lat: 50.0755, lng: 14.4378 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'budapest': { lat: 47.4979, lng: 19.0402 },
  'liubliana': { lat: 46.0569, lng: 14.5058 },
  'ljubljana': { lat: 46.0569, lng: 14.5058 },
  'zagreb': { lat: 45.8150, lng: 15.9819 },
  'split': { lat: 43.5081, lng: 16.4402 },
  'dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'bratislava': { lat: 48.1486, lng: 17.1077 },
  'cracovia': { lat: 50.0647, lng: 19.9450 },
  'krakow': { lat: 50.0647, lng: 19.9450 },
  'varsovia': { lat: 52.2297, lng: 21.0122 },

  // Suiza, Escandinavia & Grecia/Turquía
  'zúrich': { lat: 47.3769, lng: 8.5417 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'ginebra': { lat: 46.2044, lng: 6.1432 },
  'estocolmo': { lat: 59.3293, lng: 18.0686 },
  'copenhague': { lat: 55.6761, lng: 12.5683 },
  'oslo': { lat: 59.9139, lng: 10.7522 },
  'helsinki': { lat: 60.1699, lng: 24.9384 },
  'atenas': { lat: 37.9838, lng: 23.7275 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'estambul': { lat: 41.0082, lng: 28.9784 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },

  // América
  'nueva york': { lat: 40.7128, lng: -74.0060 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'los ángeles': { lat: 34.0522, lng: -118.2437 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'méxico': { lat: 19.4326, lng: -99.1332 },
  'ciudad de méxico': { lat: 19.4326, lng: -99.1332 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },
  'río de janeiro': { lat: -22.9068, lng: -43.1729 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'bogotá': { lat: 4.7110, lng: -74.0721 },
  'lima': { lat: -12.0464, lng: -77.0428 },
  'santiago': { lat: -33.4489, lng: -70.6693 },
  'toronto': { lat: 43.6532, lng: -79.3832 },

  // Asia, África & Oceanía
  'tokio': { lat: 35.6762, lng: 139.6503 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'kioto': { lat: 35.0116, lng: 135.7681 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'seúl': { lat: 37.5665, lng: 126.9780 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'pekin': { lat: 39.9042, lng: 116.4074 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapur': { lat: 1.3521, lng: 103.8198 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'el cairo': { lat: 30.0444, lng: 31.2357 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'sídney': { lat: -33.8688, lng: 151.2093 },
  'sydney': { lat: -33.8688, lng: 151.2093 }
};

export const getCityCoordinates = (cityName: string): { lat: number; lng: number } | null => {
  if (!cityName) return null;
  const clean = cityName.toLowerCase().split(',')[0].trim();
  return CITY_COORDINATES[clean] || null;
};

// Async Nominatim OpenStreetMap Geocoder for any city/town in the world
export const getCityCoordinatesAsync = async (cityName: string): Promise<{ lat: number; lng: number } | null> => {
  if (!cityName) return null;
  const clean = cityName.toLowerCase().split(',')[0].trim();
  if (CITY_COORDINATES[clean]) return CITY_COORDINATES[clean];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'es,en' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].lat && data[0].lon) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        CITY_COORDINATES[clean] = coords;
        return coords;
      }
    }
  } catch (e) {
    console.warn(`Error al geocodificar la ciudad '${cityName}':`, e);
  }
  return null;
};

export const enrichTripPlanCoordinatesAsync = async (plan: TripPlan, preferences?: UserPreferences): Promise<TripPlan> => {
  if (!plan || !plan.options) return plan;

  // Resolve origin coordinates
  let originCoords = plan.originCoordinates;
  if (!originCoords || typeof originCoords.lat !== 'number' || originCoords.lat === 0) {
    if (preferences?.originLocation) {
      originCoords = (await getCityCoordinatesAsync(preferences.originLocation)) || undefined;
    }
    if (!originCoords && plan.origin && plan.origin !== 'Por definir') {
      originCoords = (await getCityCoordinatesAsync(plan.origin)) || undefined;
    }
  }

  const isRoundTrip = !preferences?.tripType || preferences.tripType === 'RoundTrip';

  const enrichedOptions = await Promise.all(
    plan.options.map(async option => {
      const days = await Promise.all(
        (option.days || []).map(async (day, dIdx) => {
          let baseLat = day.coordinates?.lat;
          let baseLng = day.coordinates?.lng;

          if (!baseLat || !baseLng || baseLat === 0 || baseLng === 0) {
            const fetchedCoords = await getCityCoordinatesAsync(day.location);
            baseLat = fetchedCoords?.lat || 48.8566;
            baseLng = fetchedCoords?.lng || 2.3522;
          }

          const normOrigin = plan.origin && plan.origin !== 'Por definir' ? plan.origin.toLowerCase().split(',')[0].trim() : '';
          const normDayLoc = day.location.toLowerCase().split(',')[0].trim();
          const isOriginCity = normOrigin.length > 0 && normDayLoc === normOrigin;

          let enrichedAccommodation = isOriginCity ? undefined : day.accommodation;
          if (enrichedAccommodation) {
            if (!enrichedAccommodation.coordinates || typeof enrichedAccommodation.coordinates.lat !== 'number' || enrichedAccommodation.coordinates.lat === 0) {
              enrichedAccommodation = {
                ...enrichedAccommodation,
                coordinates: {
                  lat: Number((baseLat + 0.0055).toFixed(5)),
                  lng: Number((baseLng + 0.0045).toFixed(5))
                }
              };
            }
          }

          const enrichedPois = isOriginCity ? [] : (day.pois || []).map((poi, idx) => {
            if (poi.coordinates && typeof poi.coordinates.lat === 'number' && typeof poi.coordinates.lng === 'number' && poi.coordinates.lat !== 0 && (poi.coordinates.lat !== baseLat || poi.coordinates.lng !== baseLng)) {
              return poi;
            }
            const angle = idx * 1.8 + 0.5;
            const radius = 0.006 + (idx * 0.0035);
            return {
              ...poi,
              coordinates: {
                lat: Number((baseLat + radius * Math.cos(angle)).toFixed(5)),
                lng: Number((baseLng + radius * Math.sin(angle)).toFixed(5))
              }
            };
          });

          // Ensure Day 1 transport has from = origin if specified
          let transport = [...(day.transport || [])];
          if (dIdx === 0 && plan.origin && plan.origin !== 'Por definir' && transport.length > 0) {
            if (transport[0].from !== plan.origin) {
              transport[0] = {
                ...transport[0],
                from: plan.origin,
                to: day.location
              };
            }
          }

          return {
            ...day,
            coordinates: { lat: baseLat, lng: baseLng },
            transport,
            accommodation: enrichedAccommodation,
            pois: enrichedPois
          };
        })
      );

      // Ensure return leg on last day if RoundTrip and origin is set
      if (isRoundTrip && plan.origin && plan.origin !== 'Por definir' && days.length > 0) {
        const lastDay = days[days.length - 1];
        const hasReturnTransport = lastDay.transport.some(t => t.to === plan.origin);
        if (!hasReturnTransport) {
          lastDay.transport.push({
            mode: 'Train',
            from: lastDay.location,
            to: plan.origin,
            duration: 'Regreso',
            requiresReservation: false,
            notes: `Viaje de vuelta a ${plan.origin}`
          });
        }
      }

      return {
        ...option,
        days
      };
    })
  );

  return {
    ...plan,
    originCoordinates: originCoords,
    options: enrichedOptions
  };
};

export const extractItineraryState = async (chatHistoryText: string, preferences: UserPreferences): Promise<TripPlan | null> => {
  if (!ai) return null;
  
  const cacheKey = getCacheKey(chatHistoryText, preferences);
  if (itineraryStateCache.has(cacheKey)) {
    console.log("⚡ Estado de itinerario recuperado desde la caché (0 tokens GCP consumidos)");
    return itineraryStateCache.get(cacheKey)!;
  }

  const originContext = preferences.originLocation ? `, Origen: ${preferences.originLocation}` : '';
  const tripTypeContext = preferences.tripType === 'OneWay' ? ', Tipo: Solo Ida (sin regreso al origen)' : ', Tipo: Ida y Vuelta (incluir trayecto de regreso al origen en el último día)';
  const datesContext = preferences.startDate && preferences.endDate 
    ? `, Fechas: ${preferences.startDate} a ${preferences.endDate}` 
    : '';
  const totalGroupBudget = (preferences.maxBudget) * (preferences.passengers || 1);
  const prefContext = `Preferencias: Viajeros: ${preferences.passengers || 1} persona(s), Presupuesto Máx POR PERSONA: ${preferences.maxBudget}€/persona (Presupuesto Total Grupo: ${totalGroupBudget}€), Trenes Nocturnos: ${preferences.preferNightTrains}, Ritmo: ${preferences.pace}${datesContext}${originContext}${tripTypeContext}.`;

  const promptText = `Basándote en el siguiente historial de conversación y preferencias, extrae el plan de viaje. DEBES generar EXACTAMENTE 3 opciones de itinerario (ej. Económica, Equilibrada, Rápida).

REGLAS CRÍTICAS DE RUTAS Y PRESUPUESTO:
- El valor del presupuesto estimado 'estimatedBudget' en cada opción DEBE indicarse POR PERSONA (ejemplo: "350€ / persona" o "350€/pers").
- Si hay una ciudad de origen (ej. Madrid):
  1. El Día 1 DEBE incluir el trayecto saliendo desde el origen hacia la primera ciudad de destino.
  2. Si el viaje es de 'Ida y Vuelta', el último día DEBE incluir el trayecto de regreso desde la última ciudad hacia la ciudad de origen.
  3. Si es 'Solo Ida', no incluyas el transporte de regreso.
  4. NO agregues hospedaje (hoteles) ni puntos de interés (POIs) para la ciudad de origen. Toda esa información asignala SOLO a las ciudades de destino.
- Incluye enlaces de reserva útiles, coordenadas de origen, ciudades, hoteles y POIs.

${prefContext}

Historial de Conversación:
${chatHistoryText}`;

  const modelsToTry = CANDIDATE_MODELS;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: tripPlanSchema,
          temperature: 0.2,
          maxOutputTokens: 2500,
        }
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) continue;
      
      const parsedPlan = JSON.parse(jsonStr) as TripPlan;
      const enrichedPlan = await enrichTripPlanCoordinatesAsync(parsedPlan, preferences);
      itineraryStateCache.set(cacheKey, enrichedPlan);
      return enrichedPlan;
    } catch (error: any) {
      console.warn(`Error extrayendo itinerario con modelo ${model}:`, error?.message || error);
    }
  }
  return null;
};

// ============================================================================
// 2. ADK AGENT INTEGRATION (Opcional)
// ============================================================================

const getEnv = (key: string, defaultValue: string = ''): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return defaultValue;
};

const PROJECT_ID = getEnv('PROJECT_ID', 'your-project-id');
const LOCATION_ID = getEnv('LOCATION_ID', 'us-central1');
const AGENT_ID = getEnv('AGENT_ID', 'your-agent-id');

export const isAdkConfigured = (): boolean => {
  return PROJECT_ID !== 'your-project-id' && PROJECT_ID !== '' && AGENT_ID !== 'your-agent-id' && AGENT_ID !== '';
};

const AGENT_NAME = `projects/${PROJECT_ID}/locations/${LOCATION_ID}/reasoningEngines/${AGENT_ID}`;
const ADK_BASE_URL = `https://${LOCATION_ID}-aiplatform.googleapis.com/v1/${AGENT_NAME}`;

export const initAdkSession = async (userId: string): Promise<string> => {
  const response = await fetch(`${ADK_BASE_URL}:query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classMethod: 'async_create_session', input: { user_id: userId } })
  });

  if (!response.ok) throw new Error(`Error ADK: ${response.statusText}`);
  const data = await response.json();
  return data.output.id;
};

export const streamAdkQuery = async (userId: string, sessionId: string, message: string, onChunk: (text: string) => void): Promise<void> => {
  const response = await fetch(`${ADK_BASE_URL}:streamQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classMethod: 'async_stream_query', input: { user_id: userId, session_id: sessionId, message: message } })
  });

  if (!response.ok || !response.body) throw new Error(`Error de Stream ADK: ${response.statusText}`);

  const decoder = new TextDecoder();
  for await (const chunk of response.body as any) {
    const chunkText = decoder.decode(chunk, { stream: true });
    if (!chunkText.trim()) continue;
    try {
      const lines = chunkText.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const parsed = JSON.parse(line);
        if (parsed.content?.parts?.[0]) onChunk(parsed.content.parts[0].text);
      }
    } catch (e) {}
  }
};

// ============================================================================
// ----------------------------------------------------------------------------
