/**
 * iTRAVEL_MAP - Native Intelligent Travel Copilot Agent
 * Reemplazo nativo del flujo de n8n con Function Calling (Clima Open-Meteo, 
 * Cálculo de trayectos/distancias, Enlaces de reserva y Generación de Itinerarios Multimodales).
 */

import { GoogleGenAI, Type, FunctionDeclaration, Chat } from '@google/genai';
import { TripPlan, UserPreferences } from '../types';
import { 
  getApiKey, 
  getCityCoordinatesAsync, 
  createTripPlanFromCitiesAsync, 
  enrichTripPlanCoordinatesAsync 
} from './aiService';

// ============================================================================
// 1. HERRAMIENTAS DEL AGENTE (Function Declarations para Gemini)
// ============================================================================

const weatherToolDeclaration: FunctionDeclaration = {
  name: 'getWeatherForecast',
  description: 'Obtiene el pronóstico del tiempo meteorológico real para una o varias ciudades (temperatura actual, máximas/mínimas y estado del cielo) usando Open-Meteo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: {
        type: Type.STRING,
        description: 'Nombre de la ciudad (ej. Madrid, Barcelona, Roma, París, Viena).'
      },
      days: {
        type: Type.INTEGER,
        description: 'Número de días de pronóstico (por defecto 3, máximo 7).'
      }
    },
    required: ['city']
  }
};

const routeCalculatorToolDeclaration: FunctionDeclaration = {
  name: 'calculateRouteTransport',
  description: 'Calcula distancias geográficas reales entre ciudades, recomienda el modo de transporte óptimo (tren de alta velocidad, bus o vuelo) y estima tiempos de viaje y costes en euros.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      originCity: {
        type: Type.STRING,
        description: 'Ciudad de salida o partida.'
      },
      destinationCity: {
        type: Type.STRING,
        description: 'Ciudad de destino.'
      }
    },
    required: ['originCity', 'destinationCity']
  }
};

const bookingLinksToolDeclaration: FunctionDeclaration = {
  name: 'generateBookingLinks',
  description: 'Genera enlaces directos y oficiales a Booking.com, Skyscanner, Omio, Renfe/TheTrainline y FlixBus para las ciudades del itinerario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: {
        type: Type.STRING,
        description: 'Ciudad para la cual generar los enlaces de alojamiento o transporte.'
      },
      serviceType: {
        type: Type.STRING,
        description: "'accommodation' (hoteles), 'transport' (trenes/aviones/buses) o 'all' (ambos)."
      }
    },
    required: ['city']
  }
};

const agentTools = [
  {
    functionDeclarations: [
      weatherToolDeclaration,
      routeCalculatorToolDeclaration,
      bookingLinksToolDeclaration
    ]
  }
];

// ============================================================================
// 2. IMPLEMENTACIONES REALES DE LAS HERRAMIENTAS (Tool Executors)
// ============================================================================

const WMO_WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: '☀️ Cielo despejado y soleado',
  1: '🌤️ Mayormente despejado',
  2: '⛅ Intervalos nubosos',
  3: '☁️ Nublado',
  45: '🌫️ Niebla matutina',
  48: '🌫️ Niebla con escarcha',
  51: '🌦️ Llovizna ligera',
  53: '🌦️ Llovizna moderada',
  55: '🌧️ Llovizna densa',
  61: '🌧️ Lluvia ligera',
  63: '🌧️ Lluvia moderada',
  65: '🌧️ Lluvia fuerte',
  71: '🌨️ Nieve ligera',
  73: '🌨️ Nieve moderada',
  75: '❄️ Nieve intensa',
  80: '🌧️ Chubascos breves',
  81: '🌧️ Chubascos moderados',
  82: '⛈️ Chubascos violentos',
  95: '⛈️ Tormenta eléctrica',
  96: '⛈️ Tormenta con granizo ligero',
  99: '⛈️ Tormenta eléctrica con granizo fuerte'
};

const executeWeatherForecast = async (args: { city: string; days?: number }) => {
  const cityName = args.city;
  const numDays = Math.min(Math.max(args.days || 3, 1), 7);

  try {
    const coords = await getCityCoordinatesAsync(cityName);
    if (!coords) {
      return {
        error: `No se pudieron obtener coordenadas geográficas para ${cityName}.`,
        city: cityName
      };
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) {
      return {
        error: `Error al consultar servicio meteorológico (HTTP ${res.status})`,
        city: cityName
      };
    }

    const data = await res.json();
    const current = data.current_weather;
    const daily = data.daily;

    const forecastList: any[] = [];
    if (daily && Array.isArray(daily.time)) {
      for (let i = 0; i < Math.min(daily.time.length, numDays); i++) {
        const code = daily.weathercode?.[i] ?? 0;
        forecastList.push({
          date: daily.time[i],
          maxTemp: `${daily.temperature_2m_max?.[i] ?? '--'}°C`,
          minTemp: `${daily.temperature_2m_min?.[i] ?? '--'}°C`,
          condition: WMO_WEATHER_DESCRIPTIONS[code] || 'Clima variable',
          rainProbabilityMm: `${daily.precipitation_sum?.[i] ?? 0} mm`
        });
      }
    }

    const currentCode = current?.weathercode ?? 0;
    return {
      city: cityName,
      temperatureCurrent: `${current?.temperature ?? '--'}°C`,
      windSpeed: `${current?.windspeed ?? '--'} km/h`,
      conditionCurrent: WMO_WEATHER_DESCRIPTIONS[currentCode] || 'Despejado',
      forecastUpcomingDays: forecastList
    };
  } catch (err: any) {
    return {
      error: `Fallo al procesar el clima: ${err?.message || err}`,
      city: cityName
    };
  }
};

const calculateHaversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const executeRouteTransport = async (args: { originCity: string; destinationCity: string }) => {
  const { originCity, destinationCity } = args;
  try {
    const coordsOrigin = await getCityCoordinatesAsync(originCity);
    const coordsDest = await getCityCoordinatesAsync(destinationCity);

    if (!coordsOrigin || !coordsDest) {
      return {
        origin: originCity,
        destination: destinationCity,
        notes: "Ubicaciones estimadas en red europea multimodal (Renfe, Eurostar, FlixBus, Skyscanner)."
      };
    }

    const distanceKm = calculateHaversineDistanceKm(
      coordsOrigin.lat, coordsOrigin.lng,
      coordsDest.lat, coordsDest.lng
    );

    let recommendedOptions: any[] = [];

    if (distanceKm <= 550) {
      // Prioridad: Tren de alta velocidad y Autobús
      const trainHours = Math.max(1, (distanceKm / 200)).toFixed(1);
      const busHours = Math.max(2, (distanceKm / 75)).toFixed(1);

      recommendedOptions.push({
        mode: 'Train',
        title: '🚆 Tren de Alta Velocidad (Opción recomendada)',
        provider: 'Renfe / Eurostar / Frecciarossa / TGV',
        estimatedDuration: `${trainHours} horas`,
        estimatedCostPerPerson: `${Math.round(25 + distanceKm * 0.12)}€ - ${Math.round(45 + distanceKm * 0.18)}€`,
        comfort: 'Muy alto, directo centro a centro'
      });

      recommendedOptions.push({
        mode: 'Bus',
        title: '🚌 Autobús de Larga Distancia (Opción económica)',
        provider: 'FlixBus / Alsa',
        estimatedDuration: `${busHours} horas`,
        estimatedCostPerPerson: `${Math.round(12 + distanceKm * 0.05)}€ - ${Math.round(20 + distanceKm * 0.08)}€`,
        comfort: 'Económico con Wi-Fi a bordo'
      });
    } else {
      // Distancia larga: Vuelo o Tren nocturno
      const flightHours = '1h 30m - 2h 30m (vuelo directo)';
      recommendedOptions.push({
        mode: 'Flight',
        title: '✈️ Vuelo Directo (Opción rápida)',
        provider: 'Skyscanner / Vueling / Ryanair / Iberia',
        estimatedDuration: flightHours,
        estimatedCostPerPerson: `${Math.round(35 + distanceKm * 0.06)}€ - ${Math.round(70 + distanceKm * 0.10)}€`,
        comfort: 'Máxima rapidez'
      });

      recommendedOptions.push({
        mode: 'NightTrain',
        title: '🛌 Tren Nocturno / Intercity (Ahorro de hotel)',
        provider: 'ÖBB Nightjet / Tren nocturno',
        estimatedDuration: `${Math.round(distanceKm / 90)} horas (durante la noche)`,
        estimatedCostPerPerson: `${Math.round(40 + distanceKm * 0.07)}€`,
        comfort: 'Coche cama / litera, ahorra noche de estancia'
      });
    }

    return {
      origin: originCity,
      destination: destinationCity,
      distanceKm: `${distanceKm} km`,
      transportOptions: recommendedOptions
    };
  } catch (err: any) {
    return {
      origin: originCity,
      destination: destinationCity,
      error: `Error calculando ruta: ${err?.message || err}`
    };
  }
};

const executeBookingLinks = (args: { city: string; serviceType?: string }) => {
  const city = args.city;
  const encoded = encodeURIComponent(city);
  return {
    city,
    hotels: [
      { name: `🏨 Hoteles en ${city} en Booking.com`, url: `https://www.booking.com/searchresults.es.html?ss=${encoded}` },
      { name: `🏡 Apartamentos y Alojamientos en ${city} (Airbnb)`, url: `https://www.airbnb.es/s/${encoded}/homes` }
    ],
    transports: [
      { name: `🚆 Trenes y Autobuses a ${city} en Omio`, url: `https://www.omio.es` },
      { name: `✈️ Vuelos baratos a ${city} en Skyscanner`, url: `https://www.skyscanner.es` },
      { name: `🚄 Billetes de Tren en TheTrainline`, url: `https://www.thetrainline.com/es` },
      { name: `🚌 Autobuses FlixBus a ${city}`, url: `https://www.flixbus.es` }
    ]
  };
};

// ============================================================================
// 3. AGENT RUNNER LOOP (Function Calling + Gemini)
// ============================================================================

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-2.5-flash'
];

export interface AgentExecutionResult {
  text: string;
  tripPlan?: TripPlan;
  cities: string[];
  toolsUsed: string[];
  groundingChunks: any[];
}

export const runTravelAgent = async (
  userMessage: string,
  preferences?: UserPreferences | null,
  history?: { role: string; text: string }[]
): Promise<AgentExecutionResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la API Key de Gemini.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const originStr = preferences?.originLocation ? `\n- Origen: ${preferences.originLocation}` : '';
  const datesStr = preferences?.startDate && preferences?.endDate ? `\n- Fechas: Del ${preferences.startDate} al ${preferences.endDate}` : '';
  const passengersStr = `\n- Viajeros: ${preferences?.passengers || 1}`;
  const budgetStr = `\n- Presupuesto Máximo por persona: ${preferences?.maxBudget || 1500}€`;
  const paceStr = `\n- Ritmo: ${preferences?.pace || 'Moderado'}`;
  const nightTrainsStr = `\n- Preferencia trenes nocturnos: ${preferences?.preferNightTrains ? 'Sí' : 'No'}`;

  const agentSystemInstruction = `
Eres el AGENTE INTELIGENTE AUTÓNOMO DE VIAJES iTRAVEL_MAP.
Tu función es planificar viajes increíbles, asesorar al usuario con datos reales y generar itinerarios multimodales sincronizados con el mapa interactivo.

DISPONES DE HERRAMIENTAS REALES PARA EJECUTAR:
1. 'getWeatherForecast': Consulta el clima real antes de recomendar ropa, actividades al aire libre o museos.
2. 'calculateRouteTransport': Calcula distancias exactas y opciones óptimas de tren, bus y avión.
3. 'generateBookingLinks': Proporciona enlaces directos a Booking.com, Skyscanner, Omio y TheTrainline.

REGLAS DE ACTUACIÓN:
- Idioma: Español de España (es-ES).
- Tono: Experto, motivador, muy organizado y visual (usa negritas, listas y emojis 🏨, 🚆, ✈️, 🌤️, 📍).
- Utiliza tus herramientas cuando el usuario pregunte por clima, distancias, rutas o recomendaciones de transporte.
- Enlaces markdown: Pon siempre enlaces funcionales en el formato [🏨 Booking](url) o [🚆 Omio/Tren](url).
- **SINCRONIZACIÓN CON EL MAPA**: Al final de tu respuesta, si recomiendas un viaje o mencionas una ruta de ciudades en orden de visita, añade OBLIGATORIAMENTE en la última línea el bloque JSON:
{"cities": ["Ciudad1", "Ciudad2", ...]}
`;

  const toolsUsed: string[] = [];
  let finalResponseText = '';
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: agentSystemInstruction,
          tools: agentTools,
          temperature: 0.7,
          maxOutputTokens: 2500
        }
      });

      // Contexto enriquecido para la primera llamada del usuario
      const initialPrompt = `[PREFERENCIAS DEL VIAJERO:${originStr}${datesStr}${passengersStr}${budgetStr}${paceStr}${nightTrainsStr}]\n\nCONSULTA DEL USUARIO: ${userMessage}`;
      
      let currentResponse = await chat.sendMessage({ message: initialPrompt });

      // Bucle de ejecución de herramientas (hasta 3 rondas)
      let turnCount = 0;
      while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && turnCount < 3) {
        turnCount++;
        const functionResponses: any[] = [];

        for (const call of currentResponse.functionCalls) {
          toolsUsed.push(call.name);
          let toolResult: any = {};

          if (call.name === 'getWeatherForecast') {
            toolResult = await executeWeatherForecast(call.args as any);
          } else if (call.name === 'calculateRouteTransport') {
            toolResult = await executeRouteTransport(call.args as any);
          } else if (call.name === 'generateBookingLinks') {
            toolResult = executeBookingLinks(call.args as any);
          } else {
            toolResult = { status: 'unknown_tool' };
          }

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: toolResult,
              id: call.id
            }
          });
        }

        // Enviamos las respuestas de las funciones de vuelta al agente
        currentResponse = await chat.sendMessage({
          message: functionResponses
        });
      }

      finalResponseText = currentResponse.text || '';
      if (finalResponseText && finalResponseText.trim()) {
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[TravelAgent] Reintento con siguiente modelo tras fallo en ${model}:`, err?.message || err);
    }
  }

  if (!finalResponseText || !finalResponseText.trim()) {
    throw new Error(lastError?.message || "No se pudo obtener respuesta del Agente de Viajes.");
  }

  // Extracción de ciudades para sincronizar con el mapa Leaflet
  let extractedCities: string[] = [];
  const citiesJsonRegex = /(?:```(?:json)?\s*)?\{\s*"cities"\s*:\s*\[([\s\S]*?)\]\s*\}(?:\s*```)?/i;
  const match = finalResponseText.match(citiesJsonRegex);
  if (match) {
    try {
      const jsonStr = match[0].replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed?.cities)) {
        extractedCities = parsed.cities;
      }
    } catch (e) {
      console.warn("No se pudo parsear el bloque de ciudades del Agente:", e);
    }
  }

  // Limpiar el bloque JSON del texto para no mostrárselo en crudo al usuario
  const cleanedText = finalResponseText.replace(/(?:```(?:json)?\s*)?\{\s*"cities"\s*:\s*\[[\s\S]*?\]\s*\}(?:\s*```)?/gi, '').trim();

  let returnedTripPlan: TripPlan | undefined;
  if (extractedCities.length > 0) {
    returnedTripPlan = (await createTripPlanFromCitiesAsync(extractedCities, preferences)) || undefined;
  }

  return {
    text: cleanedText,
    tripPlan: returnedTripPlan,
    cities: extractedCities,
    toolsUsed,
    groundingChunks: []
  };
};
