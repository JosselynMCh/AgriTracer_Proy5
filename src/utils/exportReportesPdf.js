import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportReportesToPdf({
  periodLabel,
  zonaLabel,
  kpis,
  costosPorTipo = [],
  resumenPorZona = [],
  topTrabajadores = [],
}) {
  const doc = new jsPDF()
  const primary = [11, 61, 44]

  doc.setFillColor(...primary)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Agri-Tracer | Reporte Analítico Operativo', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${periodLabel}  |  Zona: ${zonaLabel}`, 14, 21)

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Indicadores Clave (KPIs)', 14, 38)

  autoTable(doc, {
    startY: 42,
    head: [['Indicador', 'Valor']],
    body: [
      ['Costo Promedio por Persona', `S/. ${Number(kpis.costoPromedio || 0).toFixed(2)}`],
      ['Reingreso HPW Promedio', `${Number(kpis.reingresoHpw || 0).toFixed(1)}%`],
      ['Puntualidad de Buses', `${Number(kpis.puntualidadBuses || 0).toFixed(1)}%`],
      ['Trabajadores Activos', String(kpis.trabajadoresActivos ?? 0)],
    ],
    headStyles: { fillColor: primary },
    styles: { fontSize: 9 },
  })

  let y = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Desglose de Costos de Transporte', 14, y)

  autoTable(doc, {
    startY: y + 4,
    head: [['Tipo de Costo', 'Importe Total (S/.)', 'Participación']],
    body: costosPorTipo.map((c) => [
      c.tipo,
      `S/. ${Number(c.total || 0).toFixed(2)}`,
      `${c.percent}%`,
    ]),
    headStyles: { fillColor: primary },
    styles: { fontSize: 9 },
  })

  y = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Resumen Analítico por Zona', 14, y)

  autoTable(doc, {
    startY: y + 4,
    head: [['Zona', 'Convocatorias', 'Requeridos', 'Viajes', 'Costo Total']],
    body: resumenPorZona.map((z) => [
      z.zona,
      String(z.convocatorias),
      String(z.requeridos),
      String(z.viajes),
      `S/. ${Number(z.costo_total || 0).toFixed(2)}`,
    ]),
    headStyles: { fillColor: primary },
    styles: { fontSize: 9 },
  })

  y = doc.lastAutoTable.finalY + 10
  if (y > 235) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4. Top Trabajadores Evaluados (HPW)', 14, y)

  autoTable(doc, {
    startY: y + 4,
    head: [['DNI', 'Trabajador', 'Distrito', 'Asistencia', 'Puntaje HPW']],
    body: topTrabajadores.map((w) => [
      w.numero_documento,
      `${w.nombres} ${w.apellidos}`,
      w.distrito,
      `${Number(w.porcentaje_asistencia || 0).toFixed(0)}%`,
      Number(w.puntaje_hpw || 0).toFixed(1),
    ]),
    headStyles: { fillColor: primary },
    styles: { fontSize: 8.5 },
  })

  doc.save('reporte_analitica_agri_tracer.pdf')
}
