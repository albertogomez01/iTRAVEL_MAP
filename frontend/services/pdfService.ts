import jsPDF from 'jspdf';
import { TripPlan, UserPreferences } from '../types';

export const generateItineraryPDF = async (
  plan: TripPlan, 
  selectedOptionId: string | null, 
  preferences: UserPreferences
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const option = plan.options.find(o => o.id === selectedOptionId) || plan.options[0];
  if (!option) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate-950
  doc.rect(0, 0, pageWidth, 38, 'F');

  // App Logo / Title
  doc.setTextColor(20, 184, 166); // Teal-500
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('iTRAVEL_MAP', margin, 18);

  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Tu Copiloto de Viajes Inteligente con IA', margin, 24);

  // Origin & Dest Info
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`📍 Origen: ${plan.origin}`, margin, 32);
  
  const destText = `🎯 Destino: ${option.title}`;
  doc.text(destText, pageWidth - margin - doc.getTextWidth(destText), 32);

  y = 46;

  // 2. Summary Card
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 3, 3, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text(`Ruta Seleccionada: ${option.title}`, margin + 5, y + 7);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Duración: ${option.totalDuration} | Presupuesto est.: ${option.estimatedBudget} | Viajeros: ${preferences.passengers || 1} (${preferences.tripType === 'RoundTrip' ? 'Ida y Vuelta' : 'Solo Ida'})`, 
    margin + 5, 
    y + 15
  );

  y += 30;

  // 3. Days Timeline Breakdown
  doc.setFontSize(13);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text('Plan Detallado Día a Día', margin, y);
  y += 7;

  for (let i = 0; i < option.days.length; i++) {
    const day = option.days[i];

    // Page overflow check
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    // Day Bar Header
    doc.setFillColor(13, 148, 136); // Teal-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Día ${day.dayNumber}: ${day.location}${day.theme ? ` - ${day.theme}` : ''}`, margin + 4, y + 5.5);

    y += 12;

    // Transport Info
    if (day.transport && day.transport.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('🚌 Transportes:', margin + 4, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      day.transport.forEach(t => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        const transportLine = `• ${t.mode}${t.provider ? ` (${t.provider})` : ''}: ${t.from} ➔ ${t.to}${t.duration ? ` [Duración: ${t.duration}]` : ''}${t.requiresReservation ? ' (Reserva Obligatoria)' : ''}`;
        doc.text(transportLine, margin + 8, y, { maxWidth: pageWidth - (margin * 2) - 10 });
        y += 5;
      });
      y += 1;
    }

    // POIs Info
    if (day.pois && day.pois.length > 0) {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('🏛️ Actividades y Lugares Destacados:', margin + 4, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      day.pois.forEach(poi => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        const poiLine = `• ${poi.name} [${poi.category}]${poi.description ? `: ${poi.description}` : ''}`;
        doc.text(poiLine, margin + 8, y, { maxWidth: pageWidth - (margin * 2) - 10 });
        y += 5;
      });
      y += 1;
    }

    // Accommodation Info
    if (day.accommodation) {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`🏨 Alojamiento: ${day.accommodation.type} - ${day.accommodation.name} (${day.accommodation.location})`, margin + 4, y);
      y += 6;
    }

    y += 5; // Spacing between days
  }

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${pageNum} de ${totalPages} | Generado automáticamente con iTRAVEL_MAP`, margin, pageHeight - 8);
  }

  // Save File
  const sanitize = (s: string) => s.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `iTRAVEL_MAP_${sanitize(plan.origin)}_${sanitize(option.title)}.pdf`;
  doc.save(fileName);
};
