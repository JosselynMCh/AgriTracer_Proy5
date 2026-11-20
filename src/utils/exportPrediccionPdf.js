import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPrediccionToPdf({
  selectedConv,
  resumen,
  informeOptimizacion,
  busesRecomendados = [],
  empresaRecomendada,
  busesDisponibles = [],
  rutaRecomendada,
  mejoresTrabajadores = [],
}) {
  const doc = new jsPDF()
  const primary = [11, 61, 44]

  // Encabezado
  doc.setFillColor(...primary)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Agri-Tracer | Reporte de Predicción Operativa', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Campaña: ${selectedConv?.titulo || 'General'} (${selectedConv?.fecha || '—'})`,
    14,
    21
  )

  // Resumen KPI
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1. Resumen de Capacidad y Campamentos Olmos', 14, 38)

  autoTable(doc, {
    startY: 42,
    head: [['Indicador', 'Valor']],
    body: [
      ['Trabajadores Requeridos en Campaña', String(resumen?.trabajadoresRequeridos ?? 0)],
      ['Asientos en Buses Disponibles', String(resumen?.asientosDisponibles ?? 0)],
      ['Déficit de Asientos', String(resumen?.deficitAsientos ?? 0)],
      ['Buses Extra a Contratar', String(resumen?.busesExtraNecesarios ?? 0)],
      [
        'Trabajadores para Hospedaje en Campamento Olmos',
        String(resumen?.trabajadoresParaCampamentoOlmos ?? 0),
      ],
    ],
    headStyles: { fillColor: primary },
    styles: { fontSize: 9 },
  })

  // Empresa recomendada y buses disponibles
  let currentY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2. Flota Disponible y Empresa Recomendada', 14, currentY)

  currentY += 6
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  if (busesRecomendados.length > 0) {
    doc.text(
      `Bus óptimo recomendado: ${busesRecomendados
        .map((b) => `${b.codigo_interno} (${b.capacidad} asientos)`)
        .join(' + ')} | Ahorro estimado: S/. ${Number(
        informeOptimizacion?.ahorroEstimado || 0
      ).toFixed(2)} (${informeOptimizacion?.porcentajeAhorro || 0}%)`,
      14,
      currentY
    )
    currentY += 5
  }
  if (empresaRecomendada) {
    doc.text(
      `Empresa recomendada: ${empresaRecomendada.razon_social} | Contacto: ${
        empresaRecomendada.nombre_contacto || '—'
      } (${empresaRecomendada.telefono || '—'})`,
      14,
      currentY
    )
    currentY += 5
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Código', 'Placa', 'Proveedor', 'Asientos']],
    body:
      busesDisponibles.length > 0
        ? busesDisponibles.map((b) => [
            b.codigo_interno,
            b.numero_placa,
            b.proveedor,
            String(b.capacidad),
          ])
        : [['—', '—', 'Sin buses disponibles actualmente', '0']],
    headStyles: { fillColor: primary },
    styles: { fontSize: 9 },
  })

  // Ruta recomendada hacia Olmos
  currentY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('3. Ruta Recomendada hacia Campamentos de Olmos', 14, currentY)

  currentY += 6
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  if (rutaRecomendada) {
    doc.text(
      `Ruta: ${rutaRecomendada.nombre} (${rutaRecomendada.descripcion_origen} -> ${
        rutaRecomendada.descripcion_destino
      }) | ${rutaRecomendada.distancia_estimada_km ?? '—'} km`,
      14,
      currentY
    )
    currentY += 5
    const stopsText = (rutaRecomendada.paraderos || [])
      .map((p) => `#${p.orden_paradero} ${p.nombre_paradero}`)
      .join('  ->  ')
    if (stopsText) {
      doc.text(`Paraderos: ${stopsText}`, 14, currentY, { maxWidth: 180 })
      currentY += 8
    }
  } else {
    doc.text('Sin ruta activa registrada.', 14, currentY)
    currentY += 6
  }

  // Ranking mejores trabajadores
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('4. Mejores Trabajadores de Campañas Anteriores (Top HPW)', 14, currentY + 4)

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Trabajador', 'DNI', 'Distrito', 'HPW', 'Asist.', 'Alojamiento']],
    body: mejoresTrabajadores.slice(0, 30).map((w, idx) => [
      String(idx + 1),
      `${w.nombres} ${w.apellidos}`,
      w.numero_documento,
      w.distrito,
      w.puntaje_hpw.toFixed(1),
      `${w.porcentaje_asistencia.toFixed(0)}%`,
      w.requiere_campamento_olmos ? 'Campamento Olmos' : 'Traslado local',
    ]),
    headStyles: { fillColor: primary },
    styles: { fontSize: 8.5 },
  })

  const safeTitle = (selectedConv?.titulo || 'general')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
  doc.save(`prediccion_${safeTitle}.pdf`)
}
