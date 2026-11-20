import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportUserGuideToPdf(guideModules) {
  const doc = new jsPDF()
  const primary = [11, 61, 44]

  // Portada / Encabezado
  doc.setFillColor(...primary)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.text('Agri-Tracer & Swarm 2.0 | Guía de Usuario', 14, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Manual operativo completo del sistema de gestión de personal HPW, flota y rutas',
    14,
    23
  )

  let currentY = 42

  guideModules.forEach((mod, index) => {
    if (currentY > 245) {
      doc.addPage()
      currentY = 20
    }

    doc.setTextColor(...primary)
    doc.setFontSize(12.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${index + 1}. ${mod.title}`, 14, currentY)

    currentY += 5.5
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(mod.summary, 180)
    doc.text(descLines, 14, currentY)
    currentY += descLines.length * 4.5 + 2

    autoTable(doc, {
      startY: currentY,
      head: [['Paso', 'Acción en el sistema', 'Resultado esperado']],
      body: mod.steps.map((s, idx) => [String(idx + 1), s.action, s.detail]),
      headStyles: { fillColor: primary },
      styles: { fontSize: 8.5 },
      margin: { left: 14, right: 14 },
    })

    currentY = doc.lastAutoTable.finalY + 5
    doc.setTextColor(21, 128, 61)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    const tipLines = doc.splitTextToSize(`Tip: ${mod.tip}`, 180)
    doc.text(tipLines, 14, currentY)
    currentY += tipLines.length * 4 + 8
  })

  doc.save('guia_usuario_agri_tracer.pdf')
}
