# iTRAVEL_MAP - Planificador Multimodal de Viajes Inteligente con IA

Plataforma web inteligente de planificación de viajes multimodales que utiliza Inteligencia Artificial (Google Gemini) para generar rutas complejas, visualizar mapas interactivos con Leaflet, optimizar transportes y alojamientos, y permitir guardar itinerarios en la nube mediante Firebase.

---

## 🤖 ¿Qué hace iTRAVEL_MAP? (Visión para Inteligencia Artificial y Usuarios)

iTRAVEL_MAP actúa como un copiloto experto de viajes con las siguientes capacidades principales:

1. **Planificación Multimodal Inteligente**: Diseña itinerarios paso a paso combinando trenes de alta velocidad e Interrail, autobuses de larga distancia (FlixBus, Alsa) y vuelos (Skyscanner, Ryanair).
2. **Generación de 3 Opciones por Viaje**: Para cada consulta, la IA analiza y extrae automáticamente 3 alternativas de itinerario:
   - **Opción Económica**: Prioriza rutas de bajo coste y transportes asequibles.
   - **Opción Equilibrada**: Balance óptimo entre tiempo de viaje, coste y comodidad.
   - **Opción Rápida / Premium**: Prioriza conexiones directas y transportes rápidos.
3. **Mapa Interactivo Leaflet & Coordenadas Reales**: Renderiza visualmente las trayectorias entre ciudades mediante polígonos animados y marcadores numerados por día.
4. **Búsqueda Mundial de Ciudades**: Autocompletado rápido de ciudades de todo el mundo mediante la API de OpenStreetMap Nominatim.
5. **Ajuste de Preferencias**: Panel lateral configurable con origen del viaje, fechas, presupuesto máximo (€), ritmo (Relajado, Moderado, Intenso) y prioridad de transportes nocturnos para ahorrar noches de hotel.
6. **Guardado en la Nube con Firebase**: Autenticación mediante Google Sign-in y almacenamiento de viajes guardados en Cloud Firestore.

---

## 🛠️ Arquitectura del Proyecto

El repositorio está organizado en dos módulos principales:

* `frontend/`: Aplicación SPA en React + TypeScript + Vite + Tailwind CSS + Leaflet.
  - `frontend/services/aiService.ts`: Lógica de integración con Google GenAI / Gemini API (chat conversacional + orquestación JSON estructurada).
  - `frontend/services/firebase.ts`: Autenticación con Google y Firestore para guardar y borrar itinerarios.
  - `frontend/components/`: Componentes UI (mapa interactivo, vista detallada de itinerarios, asistente flotante, modal de login y guía de inicio).
* `backend/`: Servidor Node.js / Express que actúa como proxy seguro para llamadas a Google Cloud Vertex AI (con limitador de tasa `express-rate-limit` y soporte WebSocket).

---

## 🚀 Requisitos e Instalación Local

### Prerrequisitos

* **Node.js** (v18+ recomendado) y **npm**.
* **Clave API de Gemini** (opcional para desarrollo local; se puede ingresar en la propia interfaz de la app o configurando `VITE_GEMINI_API_KEY` en `frontend/.env`).

### Instalación y Ejecución

Para instalar todas las dependencias y arrancar la aplicación (frontend + backend simultáneamente):

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## 📄 Estándar AI (`llms.txt`)

Este proyecto incluye un archivo normalizado [llms.txt](llms.txt) en la raíz y en `frontend/public/llms.txt` para que cualquier modelo de lenguaje o agente IA (ChatGPT, Claude, Gemini, Cursor, Antigravity, etc.) pueda comprender al instante la funcionalidad y estructura de iTRAVEL_MAP.
