import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TripPlan, UserPreferences } from '../types';

export const generateItineraryPDF = async (
  plan: TripPlan, 
  selectedOptionId: string | null, 
  preferences: UserPreferences
) => {
  const option = plan.options?.find(o => o.id === selectedOptionId) || plan.options?.[0];
  if (!option) return;

  // 1. Build an off-screen HTML element styled cleanly for canvas rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // ~A4 width at 96 DPI
  container.style.backgroundColor = '#0f172a'; // Slate-900
  container.style.color = '#f8fafc';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';

  let htmlContent = `
    <div style="background: linear-gradient(135deg, #020617 0%, #0f172a 100%); padding: 24px; border-radius: 16px; border: 1px solid #1e293b; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
        <div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #14b8a6; letter-spacing: -0.5px;">iTRAVEL_MAP 🗺️</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Tu Copiloto de Viajes Inteligente con IA</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #0d9488; color: #ffffff; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 8px;">Itinerario Confirmado</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background-color: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155;">
        <div>
          <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Origen 📍</p>
          <p style="margin: 2px 0 0 0; font-size: 15px; font-weight: 700; color: #ffffff;">${escapeHtml(plan.origin)}</p>
        </div>
        <div>
          <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Destino 🎯</p>
          <p style="margin: 2px 0 0 0; font-size: 15px; font-weight: 700; color: #2dd4bf;">${escapeHtml(option.title)}</p>
        </div>
      </div>

      <div style="margin-top: 16px; display: flex; gap: 20px; font-size: 12px; color: #cbd5e1; flex-wrap: wrap;">
        <span>⏱️ <strong>Duración:</strong> ${escapeHtml(option.totalDuration)}</span>
        <span>💰 <strong>Presupuesto est.:</strong> ${escapeHtml(option.estimatedBudget)}</span>
        <span>👥 <strong>Viajeros:</strong> ${preferences.passengers || 1} (${preferences.tripType === 'RoundTrip' ? 'Ida y Vuelta' : 'Solo Ida'})</span>
      </div>
    </div>

    <h2 style="font-size: 18px; font-weight: 800; color: #2dd4bf; margin: 0 0 16px 0; border-bottom: 2px solid #0d9488; padding-bottom: 8px;">
      Plan Detallado Día a Día
    </h2>
    <div style="display: flex; flex-direction: column; gap: 16px;">
  `;

  option.days.forEach(day => {
    htmlContent += `
      <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 8px;">
            <span style="background-color: #0d9488; color: #ffffff; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 800;">Día ${day.dayNumber}</span>
            <span>${escapeHtml(day.location)}</span>
          </h3>
          ${day.theme ? `<span style="font-size: 12px; color: #94a3b8; font-style: italic;">🎯 ${escapeHtml(day.theme)}</span>` : ''}
        </div>
    `;

    if (day.transport && day.transport.length > 0) {
      htmlContent += `
        <div style="margin-bottom: 10px;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #2dd4bf; text-transform: uppercase;">🚌 Transportes recomendados:</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
      `;
      day.transport.forEach(t => {
        htmlContent += `<li><strong>${escapeHtml(t.mode)}</strong> ${t.provider ? `(${escapeHtml(t.provider)})` : ''}: ${escapeHtml(t.from)} &rarr; ${escapeHtml(t.to)} ${t.duration ? `[${escapeHtml(t.duration)}]` : ''}</li>`;
      });
      htmlContent += `</ul></div>`;
    }

    if (day.pois && day.pois.length > 0) {
      htmlContent += `
        <div style="margin-bottom: 10px;">
          <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #2dd4bf; text-transform: uppercase;">🏛️ Actividades y Lugares destacados (POIs):</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
      `;
      day.pois.forEach(poi => {
        htmlContent += `<li><strong>${escapeHtml(poi.name)}</strong> <span style="color: #94a3b8;">[${escapeHtml(poi.category)}]</span>${poi.description ? `: ${escapeHtml(poi.description)}` : ''}</li>`;
      });
      htmlContent += `</ul></div>`;
    }

    if (day.accommodation) {
      htmlContent += `
        <div>
          <p style="margin: 0 0 2px 0; font-size: 11px; font-weight: 700; color: #2dd4bf; text-transform: uppercase;">🏨 Alojamiento sugerido:</p>
          <p style="margin: 0; font-size: 12px; color: #cbd5e1;">${escapeHtml(day.accommodation.type)} &mdash; <strong>${escapeHtml(day.accommodation.name)}</strong> (${escapeHtml(day.accommodation.location)})</p>
        </div>
      `;
    }

    htmlContent += `</div>`;
  });

  htmlContent += `
    </div>
    <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 12px;">
      Generado automáticamente por iTRAVEL_MAP 🗺️ • Tu Copiloto de Viajes Inteligente con IA
    </div>
  `;

  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f172a',
      logging: false
    });

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `iTRAVEL_MAP_${sanitize(plan.origin)}_${sanitize(option.title)}.pdf`;
    pdf.save(fileName);
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('Error generando PDF con html2canvas:', err);
  }
};

function escapeHtml(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
