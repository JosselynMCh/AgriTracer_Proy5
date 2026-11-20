import { useState } from 'react'
import { exportUserGuideToPdf } from '../../utils/exportUserGuidePdf'

const FAQS = [
  {
    id: 1,
    question: '¿Cómo generar una nueva convocatoria HPW?',
    answer:
      'Ingresa a Convocatorias HPW, haz clic en "+ Nueva Convocatoria", completa título, fecha de trabajo, turno, zona, distrito y cantidad requerida. Al guardar se registrará en la base de datos Neon.',
  },
  {
    id: 2,
    question: '¿Cómo registrar buses y asignarlos según sus asientos?',
    answer:
      'En "Buses y Asignación", primero registra la unidad con su placa y capacidad de asientos. Luego haz clic en "Asignar a ruta" para vincular el bus a una ruta y convocatoria validando que no se exceda su capacidad.',
  },
  {
    id: 3,
    question: '¿Cómo funciona la Predicción de buses y campamentos Olmos?',
    answer:
      'En "Predicción", elige la campaña registrada. El sistema ordena primero los buses con capacidad similar (evitando desperdicio de asientos), calcula el ahorro de costos, recomienda la empresa a contratar si falta flota, muestra la ruta hacia Olmos en Google Maps y lista el ranking HPW con contacto directo por WhatsApp.',
  },
  {
    id: 4,
    question: '¿Cómo ver el detalle de rendimiento y cambiar mi foto de perfil?',
    answer:
      'En "Trabajadores" o "Predicción", haz clic en el ícono de ojo para abrir la gráfica de rendimiento por campaña y los motivos del puntaje. En "Configuración", usa el ícono de cámara sobre tu avatar para subir tu foto (se guarda en Base64 en Neon).',
  },
]

const GUIDE_MODULES = [
  {
    id: 'dashboard',
    shortLabel: 'Dashboard',
    title: 'Dashboard General e Indicadores',
    summary:
      'Presenta en tiempo real los KPIs operativos desde Neon: porcentaje de reingreso HPW, costo promedio de transporte por persona, distritos cubiertos y trabajadores convocados, además del mapa de cobertura en Google Maps.',
    tip: 'Haz clic en "Ver todas →" en Convocatorias Recientes para ir directo al módulo completo de convocatorias.',
    flow: ['KPIs Neon', 'Mapa Cobertura', 'Gráficos Reingreso/Costos', 'Alertas'],
    steps: [
      {
        action: 'Revisar tarjetas KPI superiores',
        detail: 'Muestra métricas consolidadas de vista_indicadores_dashboard.',
      },
      {
        action: 'Explorar Mapa de Rutas y Cobertura',
        detail: 'Filtra por región (Lambayeque - Piura) y haz clic en los marcadores.',
      },
      {
        action: 'Analizar evolución y alertas',
        detail: 'Consulta las tendencias de reingreso HPW, costos por viaje y notificaciones.',
      },
    ],
  },
  {
    id: 'convocatorias',
    shortLabel: 'Convocatorias',
    title: 'Gestión de Convocatorias HPW',
    summary:
      'Permite planificar campañas agrícolas, definir la cantidad de trabajadores HPW requeridos por zona/distrito y monitorear la distribución porcentual por zona.',
    tip: 'Mantén actualizados los estados (Programada, Enviada, En Proceso) para que aparezcan correctamente en Predicción.',
    flow: ['+ Nueva Convocatoria', 'Zona / Distrito', 'Requeridos', 'Guardar en Neon'],
    steps: [
      {
        action: 'Crear convocatoria',
        detail: 'Presiona "+ Nueva Convocatoria" y define fecha, turno, zona y requeridos.',
      },
      {
        action: 'Revisar distribución por zona',
        detail: 'El gráfico de dona se actualiza automáticamente con los registros de Neon.',
      },
      {
        action: 'Consultar detalle',
        detail: 'Usa el ícono de ojo en cualquier fila para ver campaña, turno y distrito.',
      },
    ],
  },
  {
    id: 'flota',
    shortLabel: 'Buses y Rutas',
    title: 'Buses, Asignación y Rutas (Google Maps)',
    summary:
      'Integra el registro de flota con su capacidad de asientos, la asignación a viajes según convocatoria y el trazado interactivo de rutas y paraderos en Google Maps.',
    tip: 'Al crear una ruta nueva puedes hacer clic directamente en el mapa para fijar el Punto A (Origen) y Punto B (Destino).',
    flow: ['Registrar Bus', 'Definir Asientos', 'Trazar Ruta Maps', 'Asignar Viaje'],
    steps: [
      {
        action: 'Registrar unidad en Buses y Asignación',
        detail: 'Ingresa placa, código interno, proveedor, GPS y capacidad de asientos.',
      },
      {
        action: 'Asignar bus a ruta',
        detail: 'El sistema valida que los pasajeros previstos no superen los asientos del bus.',
      },
      {
        action: 'Gestionar rutas en Google Maps',
        detail: 'En Rutas y Transporte, selecciona una fila para enfocar sus paraderos numerados.',
      },
    ],
  },
  {
    id: 'gps',
    shortLabel: 'Seguimiento GPS',
    title: 'Monitoreo GPS en Tiempo Real',
    summary:
      'Muestra la última posición registrada en posiciones_gps para cada bus de la flota, su velocidad en km/h, estado operativo y ruta asignada.',
    tip: 'Haz clic en cualquier bus de la tabla "Estado de Buses" para centrar el mapa de Google Maps en esa unidad.',
    flow: ['Filtrar Bus', 'Ver Coordenadas', 'Velocidad km/h', 'Actualizar'],
    steps: [
      {
        action: 'Seleccionar bus o ver todos',
        detail: 'Usa el selector superior o haz clic en una fila de la tabla.',
      },
      {
        action: 'Inspeccionar marcador en el mapa',
        detail: 'Visualiza placa, estado y velocidad actual en la tarjeta superior del mapa.',
      },
      {
        action: 'Refrescar posiciones',
        detail: 'Presiona "Actualizar" para consultar las últimas lecturas desde Neon.',
      },
    ],
  },
  {
    id: 'trabajadores',
    shortLabel: 'Trabajadores',
    title: 'Trabajadores y Análisis de Rendimiento',
    summary:
      'Administra el padrón de trabajadores por DNI, distrito y clasificación HPW, incluyendo una ficha de rendimiento con gráficas por campaña y factores de desempeño.',
    tip: 'El botón "Ver Detalle" revela las notas de evaluación y el motivo de selección de campañas anteriores.',
    flow: ['Buscar DNI/Nombre', 'Ver Perfil', 'Gráfica Rendimiento', 'Registrar Nuevo'],
    steps: [
      {
        action: 'Filtrar trabajadores',
        detail: 'Busca por DNI o nombre, y filtra por distrito o estado.',
      },
      {
        action: 'Abrir ficha de rendimiento',
        detail: 'Haz clic en el ojo o "Ver Detalle" para ver productividad, asistencia y calidad.',
      },
      {
        action: 'Registrar trabajador',
        detail: 'Usa "+ Registrar" para añadir nuevos trabajadores directamente en Neon.',
      },
    ],
  },
  {
    id: 'prediccion',
    shortLabel: 'Predicción',
    title: 'Predicción Operativa, Costos y Campamentos Olmos',
    summary:
      'Analiza una campaña seleccionada para recomendar el bus óptimo de capacidad similar, simular escenarios de costos, sugerir empresas a contratar y priorizar trabajadores lejanos para campamentos de Olmos.',
    tip: 'Usa el ícono de celular en la tabla de trabajadores para contactarlos directamente por WhatsApp.',
    flow: ['Elegir Campaña', 'Bus Óptimo (Best-Fit)', 'Simulación Costos', 'Exportar PDF'],
    steps: [
      {
        action: 'Seleccionar campaña',
        detail: 'Elige la convocatoria en el selector superior para recalcular la predicción.',
      },
      {
        action: 'Evaluar bus óptimo y escenarios',
        detail: 'Revisa el ahorro frente a buses sobredimensionados o contratación externa.',
      },
      {
        action: 'Contactar o exportar',
        detail: 'Abre WhatsApp/Detalle en el ranking HPW o descarga el reporte completo en PDF.',
      },
    ],
  },
]

export default function AyudaSection() {
  const [openFaqId, setOpenFaqId] = useState(null)
  const [activeGuideId, setActiveGuideId] = useState(GUIDE_MODULES[0].id)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    asunto: '',
    categoria: 'Seguimiento GPS',
    descripcion: '',
  })

  const activeGuide =
    GUIDE_MODULES.find((m) => m.id === activeGuideId) || GUIDE_MODULES[0]

  const handleSendTicket = (e) => {
    e.preventDefault()
    if (!ticketForm.asunto.trim() || !ticketForm.descripcion.trim()) return
    setTicketSent(true)
    setTicketForm({
      asunto: '',
      categoria: 'Seguimiento GPS',
      descripcion: '',
    })
  }

  return (
    <div className="space-y-4">
      {/* Fila superior: Hero Ayuda + Preguntas Frecuentes */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6 relative overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/80 text-[#0b4f34]">
            <svg
              className="h-16 w-16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-base font-extrabold text-[#147a3f] shadow-sm border border-emerald-100">
              ?
            </span>
          </div>

          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              ¿Necesitas ayuda?
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Consulta la guía interactiva de Agri-Tracer &amp; Swarm 2.0, revisa
              las preguntas frecuentes o envía un ticket a soporte técnico.
            </p>
            <button
              type="button"
              onClick={() => {
                setTicketSent(false)
                setShowTicketModal(true)
              }}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
            >
              <span>Contactar Soporte</span>
            </button>
          </div>
        </div>

        {/* Preguntas Frecuentes */}
        <div className="xl:col-span-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#147a3f] text-xs font-bold text-white">
                ?
              </span>
              <h2 className="text-[15px] font-bold text-gray-900">
                Preguntas Frecuentes
              </h2>
            </div>
            <span className="text-xs font-medium text-gray-400">
              {FAQS.length} temas
            </span>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-gray-200/80 bg-gray-50/50 transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-xs sm:text-sm font-medium text-gray-800 cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-200/70 px-4 py-2.5 text-xs text-gray-600 leading-relaxed bg-white rounded-b-xl">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Guías y Manuales (Ancho completo + interactivo + Descarga PDF a la derecha) */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#147a3f]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1Z" />
              </svg>
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Guías y Manuales de Usuario
              </h2>
              <p className="text-xs text-gray-500">
                Explora cada módulo de forma interactiva o descarga la guía completa en PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => exportUserGuideToPdf(GUIDE_MODULES)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>Descargar Guía en PDF</span>
          </button>
        </div>

        {/* Pestañas interactivas */}
        <div className="flex flex-wrap gap-2">
          {GUIDE_MODULES.map((mod, idx) => {
            const isActive = mod.id === activeGuide.id
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveGuideId(mod.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#0b3d2c] text-white shadow-xs'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-[#147a3f]'
                }`}
              >
                {idx + 1}. {mod.shortLabel}
              </button>
            )
          })}
        </div>

        {/* Contenido del módulo seleccionado */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Izquierda: Descripción, flujo visual y pasos */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-[#0b3d2c]">
                {activeGuide.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                {activeGuide.summary}
              </p>
            </div>

            {/* Flujo en cuadros */}
            <div className="flex flex-wrap items-center gap-2">
              {activeGuide.flow.map((stepLabel, idx) => (
                <div key={stepLabel} className="flex items-center gap-2">
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800">
                    {stepLabel}
                  </span>
                  {idx < activeGuide.flow.length - 1 && (
                    <span className="text-emerald-600 font-bold">→</span>
                  )}
                </div>
              ))}
            </div>

            {/* Pasos detallados */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {activeGuide.steps.map((s, idx) => (
                <div
                  key={s.action}
                  className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-2xs space-y-1.5"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-[#147a3f]">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-bold text-gray-900">{s.action}</p>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Derecha: Ilustración visual + Tip destacado */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4 rounded-xl border border-gray-200/80 bg-gray-50/70 p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <img
                src="/img/logoAgriTracert.png"
                alt="Agri-Tracer Guía"
                className="h-16 w-16 rounded-2xl bg-white p-2 shadow-sm object-contain border border-gray-100"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">
                  Módulo: {activeGuide.shortLabel}
                </p>
                <p className="text-[11px] text-gray-500">
                  Integrado en tiempo real con Neon PostgreSQL
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white p-3.5 text-xs space-y-1">
              <p className="font-bold text-[#147a3f]">💡 Consejo operativo</p>
              <p className="text-gray-600 leading-relaxed">{activeGuide.tip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Soporte Técnico (Ancho completo) */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#147a3f]">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">
              Soporte Técnico
            </h2>
            <p className="text-xs text-gray-500">
              ¿Tienes algún inconveniente? Contáctanos directamente.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-emerald-50/70 px-4 py-2 text-xs sm:text-sm font-medium text-gray-800 border border-emerald-100">
            <span>📞 931 869 772</span>
            <span>✉ soporte@agrovision.pe</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setTicketSent(false)
              setShowTicketModal(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
          >
            <span>Enviar Ticket</span>
          </button>
        </div>
      </div>

      {/* Modal Enviar Ticket */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Enviar Ticket de Soporte
              </h3>
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {ticketSent ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold">
                  ✓
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Ticket registrado correctamente
                </p>
                <p className="text-xs text-gray-500">
                  Nuestro equipo de soporte te responderá a la brevedad.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="rounded-lg bg-[#147a3f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0f6132] cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Asunto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Consulta sobre predicción de buses"
                    value={ticketForm.asunto}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, asunto: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Módulo
                  </label>
                  <select
                    value={ticketForm.categoria}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, categoria: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option>Dashboard</option>
                    <option>Convocatorias HPW</option>
                    <option>Buses y Asignación</option>
                    <option>Rutas y Transporte</option>
                    <option>Seguimiento GPS</option>
                    <option>Trabajadores</option>
                    <option>Reportes y Analítica</option>
                    <option>Predicción</option>
                    <option>Configuración</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe brevemente tu consulta o inconveniente..."
                    value={ticketForm.descripcion}
                    onChange={(e) =>
                      setTicketForm({
                        ...ticketForm,
                        descripcion: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#147a3f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0f6132] cursor-pointer"
                  >
                    Enviar Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
