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
import { 
  searchFlightDeals, 
  searchAccommodations, 
  executeOneClickTravelOptimization 
} from './dealsService';

// ============================================================================
// 1. HERRAMIENTAS DEL AGENTE (Function Declarations para Gemini)
// ============================================================================

const searchFlightDealsToolDeclaration: FunctionDeclaration = {
  name: 'searchFlightDeals',
  description: 'Busca y compara ofertas de vuelos de ida y vuelta dentro de una horquilla de fechas flexible (ej. 4 días entre el 10 y el 20 de mayo). Evalúa todas las combinaciones de fechas posibles y devuelve la combinación más económica junto a las alternativas, con precio exacto, aerolínea, fechas y horarios de ida/vuelta.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      origin: {
        type: Type.STRING,
        description: 'Ciudad de origen o código IATA (ej. Alicante, ALC, Madrid, MAD, Barcelona, BCN).'
      },
      destination: {
        type: Type.STRING,
        description: 'Ciudad de destino o código IATA (ej. Londres, LON, París, CDG, Roma, FCO).'
      },
      dateRangeStart: {
        type: Type.STRING,
        description: 'Fecha de inicio de la horquilla flexible en formato YYYY-MM-DD (ej. 2026-05-10).'
      },
      dateRangeEnd: {
        type: Type.STRING,
        description: 'Fecha de fin de la horquilla flexible en formato YYYY-MM-DD (ej. 2026-05-20).'
      },
      durationDays: {
        type: Type.INTEGER,
        description: 'Número exacto de días de estancia deseados (ej. 4).'
      },
      passengers: {
        type: Type.INTEGER,
        description: 'Número de viajeros o pasajeros (por defecto 1).'
      }
    },
    required: ['origin', 'destination', 'dateRangeStart', 'dateRangeEnd', 'durationDays']
  }
};

const searchAccommodationsToolDeclaration: FunctionDeclaration = {
  name: 'searchAccommodations',
  description: 'Busca y filtra alojamientos y hoteles en la ciudad de destino para las fechas exactas ganadoras del vuelo, aplicando un filtro estricto de reputación: nota mínima obligatoria >= 7.0 sobre 10 (o 70%). Devuelve hoteles ordenados por mejor precio con name, rating (validado >= 7.0), pricePerNight, totalPrice, coordinates [lat, lng] y bookingUrl.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      destinationCity: {
        type: Type.STRING,
        description: 'Ciudad de destino donde buscar alojamiento (ej. Londres, París, Roma).'
      },
      checkIn: {
        type: Type.STRING,
        description: 'Fecha de entrada (check-in) en formato YYYY-MM-DD.'
      },
      checkOut: {
        type: Type.STRING,
        description: 'Fecha de salida (check-out) en formato YYYY-MM-DD.'
      },
      maxBudgetPerNight: {
        type: Type.NUMBER,
        description: 'Presupuesto máximo por noche en euros (opcional).'
      },
      minRating: {
        type: Type.NUMBER,
        description: 'Nota mínima de reputación sobre 10 (por defecto 7.0. NUNCA inferior a 7.0).'
      },
      passengers: {
        type: Type.INTEGER,
        description: 'Número de huéspedes (por defecto 1).'
      }
    },
    required: ['destinationCity', 'checkIn', 'checkOut']
  }
};

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
  description: 'Genera enlaces directos y oficiales a Google Flights, Skyscanner, Booking.com, Omio, Renfe/TheTrainline y FlixBus para las ciudades del itinerario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: {
        type: Type.STRING,
        description: 'Ciudad para la cual generar los enlaces de alojamiento o transporte.'
      },
      originCity: {
        type: Type.STRING,
        description: 'Ciudad de origen opcional para generar enlaces directos de vuelos origen-destino.'
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
      searchFlightDealsToolDeclaration,
      searchAccommodationsToolDeclaration,
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

const executeBookingLinks = (args: { city: string; originCity?: string; serviceType?: string }) => {
  const city = args.city;
  const origin = args.originCity || '';
  const encodedDest = encodeURIComponent(city);
  const encodedOrigin = encodeURIComponent(origin);
  const flightQuery = origin ? `Vuelos+de+${encodedOrigin}+a+${encodedDest}` : `Vuelos+a+${encodedDest}`;
  const omioQuery = origin ? `https://www.omio.es/search-frontend/results?departure=${encodedOrigin}&arrival=${encodedDest}` : 'https://www.omio.es';

  return {
    city,
    hotels: [
      { name: `🏨 Hoteles en ${city} en Booking.com`, url: `https://www.booking.com/searchresults.es.html?ss=${encodedDest}` },
      { name: `🏡 Apartamentos y Alojamientos en ${city} (Airbnb)`, url: `https://www.airbnb.es/s/${encodedDest}/homes` }
    ],
    transports: [
      { name: `✈️ Ver vuelos directos y horarios en Google Flights`, url: `https://www.google.com/travel/flights?q=${flightQuery}` },
      { name: `✈️ Comparador de vuelos Skyscanner (${origin ? origin + ' a ' : ''}${city})`, url: `https://www.skyscanner.es` },
      { name: `🚆 Trenes y Autobuses en Omio`, url: omioQuery },
      { name: `🚄 Billetes de Tren en TheTrainline`, url: `https://www.thetrainline.com/es` },
      { name: `🚌 Autobuses FlixBus`, url: `https://www.flixbus.es` }
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
  const passengersStr = preferences?.passengers && preferences.passengers > 1 ? `\n- Viajeros: ${preferences.passengers}` : '';
  const budgetStr = preferences?.maxBudget ? `\n- Presupuesto Máximo por persona: ${preferences.maxBudget}€` : '';
  const paceStr = preferences?.pace ? `\n- Ritmo: ${preferences.pace}` : '';
  const nightTrainsStr = preferences?.preferNightTrains ? `\n- Preferencia trenes nocturnos: Sí` : '';

  // Sanitizar y estructurar el historial para que alterne estrictamente user / model
  const formattedHistory: { role: string; parts: { text: string }[] }[] = [];
  let lastRole: string | null = null;

  for (const item of (history || [])) {
    if (!item.text || !item.text.trim()) continue;
    // Omitir el saludo inicial genérico de bienvenida del copiloto
    if (item.text.includes('¡Hola! Soy tu Copiloto iTRAVEL_MAP')) continue;

    const role = (item.role === 'model' || item.role === 'assistant') ? 'model' : 'user';
    if (role === lastRole && formattedHistory.length > 0) {
      formattedHistory[formattedHistory.length - 1].parts[0].text += `\n\n${item.text}`;
    } else {
      formattedHistory.push({
        role,
        parts: [{ text: item.text }]
      });
      lastRole = role;
    }
  }

  // Gemini exige que el historial termine con 'model' para que el nuevo mensaje enviado sea 'user'
  while (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
    formattedHistory.pop();
  }

  const isFollowUp = formattedHistory.length > 0;

  const agentSystemInstruction = `
Eres el AGENTE INTELIGENTE AUTÓNOMO DE VIAJES "1-CLICK" de iTRAVEL_MAP.
Tu misión principal es actuar como un optimizador de viajes real que encuentra la MEJOR COMBINACIÓN DE VUELO + HOTEL con datos exactos, precios reales y máxima satisfacción de viaje.

DISPONES DE HERRAMIENTAS REALES PARA EJECUTAR:
1. 'searchFlightDeals': Evalúa todas las combinaciones dentro de una horquilla de fechas flexible (ej. 4 días entre el 10 y el 20 de mayo), calcula precios reales por aerolínea y fecha, y selecciona la combinación ganadora más barata.
2. 'searchAccommodations': Busca hoteles en la ciudad de destino para las fechas exactas del vuelo aplicando un FILTRO ESTRICTO DE REPUTACIÓN: nota mínima obligatoria >= 7.0 sobre 10 (o 70%), ordenados por mejor precio con coordenadas exactas y enlaces a Booking.com.
3. 'getWeatherForecast': Consulta el pronóstico meteorológico real para las fechas del viaje.
4. 'calculateRouteTransport': Calcula distancias y opciones óptimas de tren, autobús o avión.
5. 'generateBookingLinks': Genera enlaces oficiales y directos a Google Flights, Skyscanner, Booking.com y Omio.

PROTOCOLO OBLIGATORIO DE RESPUESTA EN CADENA (FLUJO 1-CLICK):
Cuando el usuario pida buscar vuelos con fechas flexibles, encontrar la mejor oferta de viaje, o use el botón 1-Click:
- PASO 1 (HERRAMIENTA): Invoca INMEDIATAMENTE 'searchFlightDeals' con el origen, destino, horquilla de fechas (dateRangeStart, dateRangeEnd) y días de estancia (durationDays).
- PASO 2 (HERRAMIENTA): Tras recibir la combinación ganadora más barata del vuelo, invoca 'searchAccommodations' para las fechas exactas de salida (checkIn) y regreso (checkOut) con minRating >= 7.0.
- PASO 3 (PRESENTACIÓN): Estructura tu respuesta final con total transparencia, motivación y claridad visual:
  * 🎯 **La Mejor Combinación Encontrada (Ganadora)**:
    - ✈️ **Vuelo de Ida y Vuelta**: Fechas exactas, aerolínea, horario de ida (aprovechando la mañana), horario de vuelta (aprovechando la tarde/noche), precio exacto por persona y enlace: [✈️ Ver Vuelos en Google Flights](url).
    - 🏨 **Alojamiento Recomendado (Nota >= 7.0 / 10)**: Nombre del hotel, valoración certificada (ej. ⭐ 8.4/10 Fabuloso), precio por noche, total de la estancia, ubicación céntrica y enlace: [🏨 Reservar Hotel en Booking.com](url).
    - 💶 **Desglose Económico Transparente**:
      • Vuelo ida/vuelta: X € / persona (Total grupo: X €)
      • Alojamiento (N noches): Y € total estancia
      • **PRECIO TOTAL COMBINADO: Z € por persona (Total viaje: Z €)**
    - 📅 **Comparativa de la Horquilla**: Breve tabla o resumen comparativo con las otras fechas alternativas evaluadas y sus diferencias de precio.
- PASO 4 (SINCRONIZACIÓN MAPA LEAFLET):
  Al final de tu respuesta, en la ÚLTIMA LÍNEA OBLIGATORIA, emite el bloque JSON con las ciudades, el vuelo y los hoteles con sus coordenadas para pintarlos en el mapa:
  {"cities": ["CiudadOrigen", "CiudadDestino"], "hotels": [{"name": "Nombre Hotel", "rating": 8.4, "pricePerNight": 76, "totalPrice": 304, "coordinates": {"lat": 51.5225, "lng": -0.0818}, "bookingUrl": "url"}], "flight": {"from": "CiudadOrigen", "to": "CiudadDestino", "airline": "Aerolinea", "departureDate": "YYYY-MM-DD", "returnDate": "YYYY-MM-DD", "price": 48}}

REGLAS DE ACTUACIÓN:
- Idioma: Español de España (es-ES).
- Tono: Experto, resolutivo, estructurado y alegre (usa negritas, listas y emojis ✈️, 🏨, 💶, ⭐, 📍).
- **CONTINUIDAD CONVERSACIONAL TOTAL**: No repitas preguntas sobre origen, fechas o número de personas si ya están en el historial o en el mensaje.
`;

  const toolsUsed: string[] = [];
  let finalResponseText = '';
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const chat = ai.chats.create({
        model,
        history: formattedHistory,
        config: {
          systemInstruction: agentSystemInstruction,
          tools: agentTools,
          temperature: 0.7,
          maxOutputTokens: 2500
        }
      });

      // Si es un mensaje de seguimiento, enviamos directamente la consulta para mantener el hilo fluido
      const promptToSend = isFollowUp
        ? userMessage
        : (originStr || datesStr || budgetStr)
          ? `[PREFERENCIAS INICIALES:${originStr}${datesStr}${passengersStr}${budgetStr}${paceStr}${nightTrainsStr}]\n\nCONSULTA DEL USUARIO: ${userMessage}`
          : userMessage;

      let currentResponse = await chat.sendMessage({ message: promptToSend });

      // Bucle de ejecución de herramientas (hasta 4 rondas para soportar la cadena Vuelo -> Hotel)
      let turnCount = 0;
      while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && turnCount < 4) {
        turnCount++;
        const functionResponses: any[] = [];

        for (const call of currentResponse.functionCalls) {
          toolsUsed.push(call.name);
          let toolResult: any = {};

          if (call.name === 'searchFlightDeals') {
            toolResult = await searchFlightDeals(call.args as any);
          } else if (call.name === 'searchAccommodations') {
            toolResult = await searchAccommodations(call.args as any);
          } else if (call.name === 'getWeatherForecast') {
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

  // Extracción de datos de sincronización para el mapa Leaflet (ciudades, hoteles y vuelo)
  let extractedCities: string[] = [];
  let extractedHotels: any[] = [];
  let extractedFlight: any = null;

  const syncJsonRegex = /(?:```(?:json)?\s*)?\{\s*"(?:cities|flight|hotels)"[\s\S]*?\}(?:\s*```)?/i;
  const match = finalResponseText.match(syncJsonRegex);
  if (match) {
    try {
      const jsonStr = match[0].replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed?.cities)) {
        extractedCities = parsed.cities;
      }
      if (Array.isArray(parsed?.hotels)) {
        extractedHotels = parsed.hotels;
      }
      if (parsed?.flight) {
        extractedFlight = parsed.flight;
      }
    } catch (e) {
      console.warn("No se pudo parsear el bloque de sincronización del Agente:", e);
    }
  }

  // Fallback para regex clásica de solo cities si no coincidió el objeto compuesto
  if (extractedCities.length === 0) {
    const citiesJsonRegex = /(?:```(?:json)?\s*)?\{\s*"cities"\s*:\s*\[([\s\S]*?)\]\s*\}(?:\s*```)?/i;
    const matchSimple = finalResponseText.match(citiesJsonRegex);
    if (matchSimple) {
      try {
        const jsonStr = matchSimple[0].replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed?.cities)) {
          extractedCities = parsed.cities;
        }
      } catch (e) {
        console.warn("No se pudo parsear el bloque de ciudades del Agente:", e);
      }
    }
  }

  // Limpiar el bloque JSON del texto para no mostrárselo en crudo al usuario
  const cleanedText = finalResponseText
    .replace(/(?:```(?:json)?\s*)?\{\s*"(?:cities|flight|hotels)"[\s\S]*?\}(?:\s*```)?/gi, '')
    .trim();

  let returnedTripPlan: TripPlan | undefined;
  if (extractedCities.length > 0) {
    returnedTripPlan = (await createTripPlanFromCitiesAsync(
      extractedCities, 
      preferences, 
      extractedHotels, 
      extractedFlight
    )) || undefined;
  }

  return {
    text: cleanedText,
    tripPlan: returnedTripPlan,
    cities: extractedCities,
    toolsUsed,
    groundingChunks: []
  };
};
