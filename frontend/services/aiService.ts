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

const MODEL_NAME = 'gemini-2.5-flash';
let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
Eres iTRAVEL_MAP, un experto planificador de viajes multimodal y copiloto.
Tu objetivo es ayudar a los usuarios a diseñar rutas complejas, especialmente en Europa, combinando Interrail, autobuses y vuelos.

IMPORTANTE: Debes comunicarte con el usuario SIEMPRE en español de España (es-ES). Todo el contenido generado, resúmenes y descripciones deben estar en español.

Capacidades y Reglas Clave:
1. Origen del Viaje: SIEMPRE pregunta desde dónde empezará el viaje el usuario si no lo especifica en su primer mensaje o en sus preferencias.
2. 3 Opciones de Ruta: Cuando propongas un itinerario, SIEMPRE ofrece 3 opciones distintas (ej. Opción Económica, Opción Equilibrada, Opción Rápida/Premium) con diferentes presupuestos y duraciones.
3. Enlaces Intuitivos: Proporciona enlaces reales o de búsqueda (ej. Skyscanner, FlixBus, Booking, Interrail) para que el usuario pueda reservar fácilmente.
4. Duración de Transportes: Especifica claramente la duración de cada trayecto entre ciudades.
5. Planificación Multimodal: Sugiere trenes, autobuses y vuelos. Avisa si un tren requiere reserva obligatoria.
6. Geolocalización: Determina siempre las coordenadas exactas (lat/lng) para la ubicación principal de cada día.

Tono: Profesional, inspirador, muy organizado y conciso. Usa markdown para facilitar la lectura.
`;

export const initChat = (preferences: UserPreferences) => {
  if (!ai) {
    try {
      ai = initAiClient();
    } catch (e) {
      throw new Error("No se ha configurado la API Key de Gemini. Añade VITE_GEMINI_API_KEY en tu entorno o en la aplicación.");
    }
  }

  const originStr = preferences.originLocation ? `\n  - Localidad de Origen: ${preferences.originLocation}` : '';
  const datesStr = preferences.startDate && preferences.endDate 
    ? `\n  - Fechas del viaje: Del ${preferences.startDate} al ${preferences.endDate}` 
    : '';

  const prefString = `Preferencias del Usuario: ${originStr}
  - Prefiere Trenes/Autobuses Nocturnos en lugar de Hoteles: ${preferences.preferNightTrains ? 'Sí' : 'No'}
  - Estilo de Alojamiento: ${preferences.budgetLevel}
  - Presupuesto Máximo Total: ${preferences.maxBudget}€
  - Ritmo de Viaje: ${preferences.pace}${datesStr}`;

  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${prefString}`,
      tools: [{ googleSearch: {} }], // Búsqueda en vivo activada
      temperature: 0.7,
    },
  });
};

export const sendMessageToAgent = async (message: string) => {
  if (!ai || !chatSession) throw new Error("Sesión de chat no inicializada");
  
  const response = await chatSession.sendMessage({ message });
  
  // Extraer enlaces de la búsqueda
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return {
    text: response.text,
    groundingChunks: groundingChunks.map((chunk: any) => ({
      web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined
    })).filter((c: any) => c.web !== undefined)
  };
};

// Schema for the Orchestrator to extract structured data
const tripPlanSchema = {
  type: Type.OBJECT,
  properties: {
    origin: { type: Type.STRING, description: "Ciudad y país de origen del viaje (ej. 'Madrid, España'). Si no se sabe, pon 'Por definir'." },
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
                    notes: { type: Type.STRING, description: "Notas en español" }
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
                      tips: { type: Type.STRING, description: "Consejos en español" }
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

export const extractItineraryState = async (chatHistoryText: string, preferences: UserPreferences): Promise<TripPlan | null> => {
  if (!ai) return null;
  
  try {
    const originContext = preferences.originLocation ? `, Origen: ${preferences.originLocation}` : '';
    const datesContext = preferences.startDate && preferences.endDate 
      ? `, Fechas: ${preferences.startDate} a ${preferences.endDate}` 
      : '';
    const prefContext = `Preferencias: Trenes Nocturnos: ${preferences.preferNightTrains}, Presupuesto Máx: ${preferences.maxBudget}€, Ritmo: ${preferences.pace}${datesContext}${originContext}.`;
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Basándote en el siguiente historial de conversación y preferencias, extrae el plan de viaje. DEBES generar EXACTAMENTE 3 opciones de itinerario (ej. Económica, Equilibrada, Rápida) para que el usuario elija. Si el usuario no ha dado un origen, pon 'Por definir'. Incluye enlaces de reserva útiles y duraciones de transporte precisas.\n\n${prefContext}\n\nHistorial de Conversación:\n${chatHistoryText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: tripPlanSchema,
        temperature: 0.2,
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    
    return JSON.parse(jsonStr) as TripPlan;
  } catch (error) {
    console.error("Error al extraer el estado del itinerario:", error);
    return null;
  }
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
// 3. IMAGE GENERATION (Logo)
// ============================================================================

export const generateAppLogo = async (): Promise<string | null> => {
  if (!ai) {
    console.error("IA no inicializada.");
    return null;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: '3D modern mobile app icon logo for a travel application. In the center, a translucent dark blue sphere of a globe with glowing cyan grid lines (latitude and longitude) and subtle continent silhouettes. Overlaid prominently in the foreground are stylized 3D letters "iT" with a vibrant coral-to-orange gradient and a soft neon glow. A subtle dashed cyan flight path orbits the globe with a small plane. Deep dark navy blue background, soft studio lighting, Octane render, iOS app icon style, clean, 8k resolution --ar 1:1',
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error al generar el logo:", error);
    return null;
  }
};
