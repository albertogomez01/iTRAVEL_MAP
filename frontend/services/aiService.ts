import { GoogleGenAI, Type, Chat, Modality } from '@google/genai';
import { TripPlan, UserPreferences } from '../types';

// ============================================================================
// 1. STANDARD GEMINI API
// ============================================================================

// Helper para obtener la API key en Vite, Vercel o proceso local
export const getApiKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.API_KEY && process.env.API_KEY !== 'api-key-this-is-not-used-can-be-ignored!') {
    return process.env.API_KEY;
  }
  return localStorage.getItem('CUSTOM_GEMINI_API_KEY') || '';
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
  
  // Si la clave empieza por AIza... o AQ... es una clave directa de Gemini API (Google AI Studio)
  const isVertex = !apiKey.startsWith('AIza') && !apiKey.startsWith('AQ');
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
7. 💾 **Guardado y Sincronización en la Nube**: Integración con autenticación Google y Firebase para guardar viajes y reanudarlos en cualquier momento.
8. 🔍 **Búsqueda Mundial de Ciudades**: Autocompletado rápido de ciudades de todo el mundo mediante OpenStreetMap Nominatim.

Reglas de Interacción:
- **Idioma**: SIEMPRE en español de España (es-ES).
- **Origen del viaje**: Si el usuario no ha especificado desde qué ciudad sale, pregúntale amablemente en tu primer mensaje.
- **Formato**: Utiliza listas con viñetas, negritas y enlaces útiles a proveedores de reserva (FlixBus, Skyscanner, Booking, Renfe, etc.).
- **Tono**: Profesional, motivador, conciso y cercano.
`;

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite'
];

let activeModelIndex = 0;
let lastPreferences: UserPreferences | null = null;

export const initChat = (preferences: UserPreferences) => {
  if (!ai) {
    try {
      ai = initAiClient();
    } catch (e) {
      throw new Error("No se ha configurado la API Key de Gemini. Añade VITE_GEMINI_API_KEY en tu entorno o en la aplicación.");
    }
  }

  lastPreferences = preferences;
  const originStr = preferences.originLocation ? `\n  - Localidad de Origen: ${preferences.originLocation}` : '';
  const datesStr = preferences.startDate && preferences.endDate 
    ? `\n  - Fechas del viaje: Del ${preferences.startDate} al ${preferences.endDate}` 
    : '';

  const prefString = `Preferencias del Usuario: ${originStr}
  - Prefiere Trenes/Autobuses Nocturnos en lugar de Hoteles: ${preferences.preferNightTrains ? 'Sí' : 'No'}
  - Estilo de Alojamiento: ${preferences.budgetLevel}
  - Presupuesto Máximo Total: ${preferences.maxBudget}€
  - Ritmo de Viaje: ${preferences.pace}${datesStr}`;

  const currentModel = CANDIDATE_MODELS[activeModelIndex] || CANDIDATE_MODELS[0];
  console.log(`Inicializando chat con modelo: ${currentModel}`);

  chatSession = ai.chats.create({
    model: currentModel,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${prefString}`,
      tools: [{ googleSearch: {} }], // Búsqueda en vivo activada
      temperature: 0.7,
    },
  });
};

export const sendMessageToAgent = async (message: string) => {
  if (!ai || !chatSession) throw new Error("Sesión de chat no inicializada");
  
  for (let attempt = 0; attempt < CANDIDATE_MODELS.length; attempt++) {
    try {
      const response = await chatSession.sendMessage({ message });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      return {
        text: response.text,
        groundingChunks: groundingChunks.map((chunk: any) => ({
          web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined
        })).filter((c: any) => c.web !== undefined)
      };
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
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'sevilla': { lat: 37.3891, lng: -5.9845 },
  'valencia': { lat: 39.4699, lng: -0.3763 },
  'málaga': { lat: 36.7213, lng: -4.4214 },
  'malaga': { lat: 36.7213, lng: -4.4214 },
  'bilbao': { lat: 43.2630, lng: -2.9350 },
  'lisboa': { lat: 38.7223, lng: -9.1393 },
  'porto': { lat: 41.1579, lng: -8.6291 },
  'roma': { lat: 41.9028, lng: 12.4964 },
  'parís': { lat: 48.8566, lng: 2.3522 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'londres': { lat: 51.5074, lng: -0.1278 },
  'berlín': { lat: 52.5200, lng: 13.4050 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'ámsterdam': { lat: 52.3676, lng: 4.9041 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'viena': { lat: 48.2082, lng: 16.3738 },
  'praga': { lat: 50.0755, lng: 14.4378 }
};

export const getCityCoordinates = (cityName: string): { lat: number; lng: number } | null => {
  if (!cityName) return null;
  const clean = cityName.toLowerCase().split(',')[0].trim();
  return CITY_COORDINATES[clean] || null;
};

export const enrichTripPlanCoordinates = (plan: TripPlan, preferences?: UserPreferences): TripPlan => {
  if (!plan || !plan.options) return plan;

  // Resolve origin coordinates
  let originCoords = plan.originCoordinates;
  if (!originCoords || typeof originCoords.lat !== 'number') {
    if (preferences?.originLocation) {
      originCoords = getCityCoordinates(preferences.originLocation) || undefined;
    }
    if (!originCoords && plan.origin && plan.origin !== 'Por definir') {
      originCoords = getCityCoordinates(plan.origin) || undefined;
    }
  }

  const isRoundTrip = !preferences?.tripType || preferences.tripType === 'RoundTrip';

  return {
    ...plan,
    originCoordinates: originCoords,
    options: plan.options.map(option => {
      const days = (option.days || []).map((day, dIdx) => {
        const baseLat = day.coordinates?.lat || 48.8566;
        const baseLng = day.coordinates?.lng || 2.3522;

        let enrichedAccommodation = day.accommodation;
        if (enrichedAccommodation) {
          if (!enrichedAccommodation.coordinates || typeof enrichedAccommodation.coordinates.lat !== 'number') {
            enrichedAccommodation = {
              ...enrichedAccommodation,
              coordinates: {
                lat: Number((baseLat + 0.0055).toFixed(5)),
                lng: Number((baseLng + 0.0045).toFixed(5))
              }
            };
          }
        }

        const enrichedPois = (day.pois || []).map((poi, idx) => {
          if (poi.coordinates && typeof poi.coordinates.lat === 'number' && typeof poi.coordinates.lng === 'number' && (poi.coordinates.lat !== baseLat || poi.coordinates.lng !== baseLng)) {
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
      });

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
  };
};

export const extractItineraryState = async (chatHistoryText: string, preferences: UserPreferences): Promise<TripPlan | null> => {
  if (!ai) return null;
  
  const originContext = preferences.originLocation ? `, Origen: ${preferences.originLocation}` : '';
  const tripTypeContext = preferences.tripType === 'OneWay' ? ', Tipo: Solo Ida (sin regreso al origen)' : ', Tipo: Ida y Vuelta (incluir trayecto de regreso al origen en el último día)';
  const datesContext = preferences.startDate && preferences.endDate 
    ? `, Fechas: ${preferences.startDate} a ${preferences.endDate}` 
    : '';
  const prefContext = `Preferencias: Trenes Nocturnos: ${preferences.preferNightTrains}, Presupuesto Máx: ${preferences.maxBudget}€, Ritmo: ${preferences.pace}${datesContext}${originContext}${tripTypeContext}.`;

  const promptText = `Basándote en el siguiente historial de conversación y preferencias, extrae el plan de viaje. DEBES generar EXACTAMENTE 3 opciones de itinerario (ej. Económica, Equilibrada, Rápida).

REGLAS CRÍTICAS DE RUTAS DE ORIGEN Y REGRESO:
- Si hay una ciudad de origen (ej. Madrid):
  1. El Día 1 DEBE incluir el trayecto saliendo desde el origen hacia la primera ciudad de destino.
  2. Si el viaje es de 'Ida y Vuelta', el último día DEBE incluir el trayecto de regreso desde la última ciudad hacia la ciudad de origen.
  3. Si es 'Solo Ida', no incluyas el transporte de regreso.
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
        }
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) continue;
      
      const parsedPlan = JSON.parse(jsonStr) as TripPlan;
      return enrichTripPlanCoordinates(parsedPlan, preferences);
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
