import { useState } from 'react'

const FAQS = [
  {
    id: 1,
    question: '¿Cómo generar una convocatoria HPW?',
    answer:
      'Ingresa a la sección Convocatorias HPW en el menú lateral, haz clic en "+ Nueva Convocatoria", completa la fecha, zona, distrito y cantidad requerida, y guarda el registro.',
  },
  {
    id: 2,
    question: '¿Cómo rastrear un bus en tiempo real?',
    answer:
      'Dirígete a Seguimiento GPS, selecciona el bus específico o deja "Todos los Buses" y haz clic en cualquier unidad de la tabla para ver su ubicación y velocidad en el mapa.',
  },
  {
    id: 3,
    question: '¿Qué hacer si el GPS no actualiza la ubicación?',
    answer:
      'Presiona el botón "Actualizar" en Seguimiento GPS. Si el problema persiste más de 10 minutos, verifica la señal del dispositivo a bordo o envía un ticket a Soporte Técnico.',
  },
  {
    id: 4,
    question: '¿Cómo exportar reportes de trabajadores?',
    answer:
      'En Reportes y Analítica, selecciona el rango de fechas deseado y haz clic en "Exportar Reporte" para descargar el archivo en Excel (.csv) o imprimir en PDF.',
  },
]

export default function AyudaSection() {
  const [openFaqId, setOpenFaqId] = useState(null)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    asunto: '',
    categoria: 'Seguimiento GPS',
    descripcion: '',
  })

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
        {/* ¿Necesitas ayuda? */}
        <div className="xl:col-span-6 relative overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
          {/* Ilustración soporte */}
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/80 text-[#0b4f34]">
            <svg
              className="h-20 w-20"
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
            <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[#147a3f] shadow-sm border border-emerald-100">
              ?
            </span>
          </div>

          <div className="text-center sm:text-left space-y-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              ¿Necesitas ayuda?
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Encuentra respuestas, consulta guías o contacta con nuestro soporte
              técnico.
            </p>
            <button
              type="button"
              onClick={() => {
                setTicketSent(false)
                setShowTicketModal(true)
              }}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
              <span>Contactar Soporte</span>
            </button>
          </div>
        </div>

        {/* Preguntas Frecuentes */}
        <div className="xl:col-span-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#147a3f] text-xs font-bold text-white">
                ?
              </span>
              <h2 className="text-[15px] font-bold text-gray-900">
                Preguntas Frecuentes
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setOpenFaqId(openFaqId ? null : FAQS[0].id)}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              Ver todas →
            </button>
          </div>

          <div className="space-y-2.5">
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
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-800 cursor-pointer"
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
                    <div className="border-t border-gray-200/70 px-4 py-3 text-xs text-gray-600 leading-relaxed bg-white rounded-b-xl">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fila inferior: Guías y Manuales + Soporte Técnico */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Guías y Manuales */}
        <div className="xl:col-span-5 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#147a3f]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1Z" />
              </svg>
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">
                Guías y Manuales
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Descarga las guías de uso del sistema.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative flex h-16 w-14 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50">
              <div className="space-y-1.5 w-8">
                <div className="h-1 rounded bg-sky-300" />
                <div className="h-1 rounded bg-sky-300" />
                <div className="h-1 w-5 rounded bg-sky-300" />
              </div>
              <span className="absolute -bottom-1 -right-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-2xs">
                PDF
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#15803d] transition hover:bg-emerald-50 cursor-pointer"
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
              <span>Descargar Manual</span>
            </button>
          </div>
        </div>

        {/* Soporte Técnico */}
        <div className="xl:col-span-7 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#147a3f]">
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
                <p className="mt-0.5 text-xs text-gray-500">
                  ¿Tienes un problema? Contáctanos.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0b4f34]">
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-emerald-50/70 px-4 py-2.5 text-xs sm:text-sm font-medium text-gray-800 border border-emerald-100">
              <span className="inline-flex items-center gap-2">
                <span className="text-[#147a3f]">📞</span>
                <span>931 869 772</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-[#147a3f]">✉</span>
                <span>soporte@agrovision.pe</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setTicketSent(false)
                setShowTicketModal(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="22" x2="11" y1="2" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>Enviar Ticket</span>
            </button>
          </div>
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
                    placeholder="Ej. Error al actualizar GPS del bus BX-104"
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
                    <option>Convocatorias HPW</option>
                    <option>Rutas y Transporte</option>
                    <option>Seguimiento GPS</option>
                    <option>Trabajadores</option>
                    <option>Reportes y Analítica</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe brevemente el inconveniente..."
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
