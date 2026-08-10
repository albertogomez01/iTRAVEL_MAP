import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Info, Compass, Sparkles, Lock } from 'lucide-react';

export type LegalTab = 'about' | 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'about',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg tracking-wide">iTRAVEL_MAP</h2>
              <p className="text-xs text-slate-400">Copiloto Inteligente de Viajes con IA</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/30 border-b border-slate-800/80 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'about'
                ? 'bg-brand-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Info size={14} />
            <span>Acerca de</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-brand-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Política de Privacidad</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-brand-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText size={14} />
            <span>Términos de Servicio</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="bg-brand-950/40 border border-brand-800/50 p-4 rounded-2xl">
                <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                  <Compass className="text-brand-400" size={18} />
                  ¿Qué es iTRAVEL_MAP?
                </h3>
                <p className="text-slate-300">
                  <strong>iTRAVEL_MAP</strong> es una plataforma interactiva de planificación de viajes impulsada por Inteligencia Artificial diseñada para revolucionar la forma en que exploras el mundo. Nuestra misión es simplificar la organización de trayectos multimodales, conectando vuelos, trenes de alta velocidad, autobuses de larga distancia y ferries en una sola experiencia fluida y visual.
                </p>
              </div>

              <p>
                Con iTRAVEL_MAP, no necesitas consultar decenas de pestañas para comparar transporte, calcular presupuestos o ubicar atracciones locales. Nuestro copiloto inteligente analiza tus preferencias personalizadas (ciudad de origen, estilo de alojamiento, presupuesto máximo por persona, número de viajeros y ritmo de viaje) para generar de forma instantánea 3 alternativas completas de itinerario: una <strong>Opción Económica</strong> enfocada en el máximo ahorro, una <strong>Opción Equilibrada</strong> que combina confort y coste optimizado, y una <strong>Opción Rápida o Premium</strong> pensada para maximizar tu tiempo de estancia.
              </p>

              <p>
                Cada itinerario generado se sincroniza automáticamente con nuestro mapa interactivo basado en Leaflet. A través del motor de enrutamiento OSRM (Open Source Routing Machine), visualizas trayectorias reales entre ciudades y ubicaciones precisas para alojamientos recomendados y puntos de interés turísticos (POIs) como monumentos, museos, restaurantes locales y espacios naturales. Además, la plataforma incluye la opción de guardar tus itinerarios en la nube mediante autenticación segura con Google Firebase, permitiéndote reanudar tus viajes planeados desde cualquier dispositivo, ya sea ordenador o teléfono móvil.
              </p>

              <p>
                Tanto si estás planificando una ruta de Interrail por Europa, una escapada de fin de semana o un gran viaje internacional, iTRAVEL_MAP te ofrece todas las herramientas necesarias para transformar tus ideas en rutas reales, optimizando cada noche de hotel y proporcionando enlaces directos a las plataformas líderes de reserva.
              </p>

              <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-brand-300">
                <span className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">🗺️ Mapa Interactivo Leaflet</span>
                <span className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">⚡ 3 Opciones de Itinerario</span>
                <span className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">🚆 Rutas Multimodales</span>
                <span className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">☁️ Sincronización en la Nube</span>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="text-emerald-400" size={18} />
                Política de Privacidad
              </h3>
              
              <p>
                En <strong>iTRAVEL_MAP</strong> nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política describe cómo recopilamos, utilizamos y protegemos la información cuando interactúas con nuestra aplicación.
              </p>

              <h4 className="font-semibold text-slate-100">1. Datos Recopilados</h4>
              <p>
                - <strong>Sesiones y Autenticación</strong>: Si inicias sesión a través de Google Firebase, procesamos tu nombre público, dirección de correo electrónico y foto de perfil para gestionar tu cuenta y sincronizar tus viajes guardados.<br />
                - <strong>Preferencias de Viaje</strong>: Guardamos de forma local en tu navegador (LocalStorage) tus preferencias de origen, presupuesto, ritmo de viaje e itinerarios generados.<br />
                - <strong>Publicidad y Cookies de Terceros</strong>: Esta plataforma utiliza scripts de Google AdSense para servir anuncios relevantes. Google AdSense puede usar cookies para mostrar publicidad basada en visitas anteriores a este u otros sitios web.
              </p>

              <h4 className="font-semibold text-slate-100">2. Uso de los Datos</h4>
              <p>
                Tus datos de viaje se utilizan exclusivamente para personalizar las recomendaciones del Copiloto de IA y dibujar las rutas en el mapa. No vendemos ni compartimos datos personales identificables con terceros con fines comerciales.
              </p>

              <h4 className="font-semibold text-slate-100">3. Eliminación de Datos</h4>
              <p>
                Puedes eliminar tus viajes guardados en cualquier momento desde el historial o cerrar sesión para borrar la caché almacenada localmente en tu dispositivo.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="text-blue-400" size={18} />
                Términos de Servicio
              </h3>

              <p>
                Al acceder y utilizar <strong>iTRAVEL_MAP</strong>, aceptas cumplir con los siguientes términos y condiciones de uso.
              </p>

              <h4 className="font-semibold text-slate-100">1. Carácter Informativo de las Recomendaciones</h4>
              <p>
                iTRAVEL_MAP genera sugerencias de rutas, transportes, precios estimados y alojamientos apoyándose en modelos de Inteligencia Artificial y datos de OpenStreetMap. Todas las estimaciones de presupuesto y horarios son <strong>meramente orientativas</strong>. Recomendamos verificar la disponibilidad y precios finales directamente en las páginas oficiales de los operadores de transporte y plataformas de reserva.
              </p>

              <h4 className="font-semibold text-slate-100">2. Enlaces a Terceros</h4>
              <p>
                Nuestra plataforma proporciona enlaces directos a sitios web de terceros (como Booking.com, Skyscanner, FlixBus, Trainline, Omio). iTRAVEL_MAP no asume responsabilidad alguna sobre las reservas, compras o servicios contratados a través de dichas páginas externas.
              </p>

              <h4 className="font-semibold text-slate-100">3. Uso Aceptable</h4>
              <p>
                Está prohibido el uso de herramientas automatizadas para extraer datos o sobrecargar las APIs de la aplicación de manera abusiva. Nos reservamos el derecho de limitar el acceso a usuarios que vulneren la seguridad o estabilidad del servicio.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 iTRAVEL_MAP</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
