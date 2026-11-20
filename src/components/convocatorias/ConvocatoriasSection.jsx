import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import LoadingOverlay from '../common/LoadingOverlay'

const STATUS_BADGES = {
  PROGRAMADA: {
    label: 'Programada',
    cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  ENVIADA: {
    label: 'Enviada',
    cls: 'bg-teal-50 text-teal-700 border border-teal-200',
  },
  EN_PROCESO: {
    label: 'En Proceso',
    cls: 'bg-sky-50 text-sky-700 border border-sky-200',
  },
  CERRADA: {
    label: 'Completada',
    cls: 'bg-green-100 text-green-700 border border-green-200',
  },
  BORRADOR: {
    label: 'Borrador',
    cls: 'bg-gray-100 text-gray-600 border border-gray-300',
  },
  CANCELADA: {
    label: 'Cancelada',
    cls: 'bg-red-50 text-red-700 border border-red-200',
  },
}

const ZONE_COLORS = ['#22a05b', '#f59e0b', '#ef4444', '#2563eb', '#8b5cf6']
const DONUT_RADIUS = 56
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

function buildSegments(zones) {
  return zones.reduce((acc, zone, index) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].nextOffset : 0
    const strokeLength = (zone.percent / 100) * DONUT_CIRCUMFERENCE
    acc.push({
      ...zone,
      color: ZONE_COLORS[index % ZONE_COLORS.length],
      strokeDasharray: `${strokeLength} ${DONUT_CIRCUMFERENCE - strokeLength}`,
      strokeDashoffset: -((prevOffset / 100) * DONUT_CIRCUMFERENCE),
      nextOffset: prevOffset + zone.percent,
    })
    return acc
  }, [])
}

function SummaryCards({ summary }) {
  const cards = [
    {
      label: 'Total Convocatorias',
      value: summary?.total ?? 0,
      iconBg: 'bg-emerald-100 text-[#15803d]',
      icon: 'users',
    },
    {
      label: 'Confirmadas',
      value: summary?.confirmadas ?? 0,
      iconBg: 'bg-emerald-100 text-emerald-600',
      icon: 'check',
    },
    {
      label: 'En Proceso',
      value: summary?.enProceso ?? 0,
      iconBg: 'bg-amber-100 text-amber-500',
      icon: 'clock',
    },
    {
      label: 'Canceladas',
      value: summary?.canceladas ?? 0,
      iconBg: 'bg-red-100 text-red-500',
      icon: 'close',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs"
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${card.iconBg}`}
          >
            {card.icon === 'users' && (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
              </svg>
            )}
            {card.icon === 'check' && (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {card.icon === 'clock' && (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            )}
            {card.icon === 'close' && (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <span className="mt-0.5 block text-2xl font-bold text-gray-900">
              {card.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ConvocatoriasSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    fecha_trabajo: '',
    turno: 'MANANA',
    id_zona: '',
    id_distrito: '',
    trabajadores_requeridos: '',
    estado: 'PROGRAMADA',
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/convocatorias')
      setData(res)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/convocatorias')
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.titulo || !form.fecha_trabajo || !form.trabajadores_requeridos) return

    try {
      setSaving(true)
      await apiFetch('/api/convocatorias', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          id_zona: form.id_zona ? Number(form.id_zona) : null,
          id_distrito: form.id_distrito ? Number(form.id_distrito) : null,
          trabajadores_requeridos: Number(form.trabajadores_requeridos),
        }),
      })
      setShowModal(false)
      setForm({
        titulo: '',
        fecha_trabajo: '',
        turno: 'MANANA',
        id_zona: '',
        id_distrito: '',
        trabajadores_requeridos: '',
        estado: 'PROGRAMADA',
      })
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const items = data?.items || []
  const segments = buildSegments(data?.distribucionZonas || [])
  const zonas = data?.catalogos?.zonas || []
  const distritos = data?.catalogos?.distritos || []

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading || saving} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#0b4f34]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-gray-900">Convocatorias HPW</h1>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#147a3f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
        >
          <span className="text-base leading-none">+</span>
          <span>Nueva Convocatoria</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <SummaryCards summary={data?.summary} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900">
              Próximas Convocatorias
            </h2>
            <span className="text-xs font-medium text-gray-400">
              {loading ? 'Cargando...' : `${items.length} registros`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-2.5 pr-3">Fecha</th>
                  <th className="py-2.5 pr-3">Zona</th>
                  <th className="py-2.5 pr-3">Distrito</th>
                  <th className="py-2.5 pr-3">Requeridos</th>
                  <th className="py-2.5 pr-3">Estado</th>
                  <th className="py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {items.map((row) => {
                  const badge = STATUS_BADGES[row.estado] || {
                    label: row.estado,
                    cls: 'bg-gray-100 text-gray-700',
                  }
                  return (
                    <tr key={row.id_convocatoria} className="hover:bg-gray-50/70">
                      <td className="py-3.5 pr-3 whitespace-nowrap font-medium text-gray-800">
                        {row.fecha}
                      </td>
                      <td className="py-3.5 pr-3">{row.zona}</td>
                      <td className="py-3.5 pr-3 font-medium text-gray-900">
                        {row.distrito}
                      </td>
                      <td className="py-3.5 pr-3 font-medium">
                        {row.trabajadores_requeridos}
                      </td>
                      <td className="py-3.5 pr-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(row)}
                          aria-label="Ver convocatoria"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-[#15803d] cursor-pointer"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribución por Zona */}
        <div className="xl:col-span-4 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">
            Distribución por Zona
          </h2>

          <div className="my-5 flex items-center justify-center">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 144 144" className="h-full w-full -rotate-90">
                {segments.map((segment) => (
                  <circle
                    key={segment.name}
                    cx="72"
                    cy="72"
                    r={DONUT_RADIUS}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="22"
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 leading-none">
                  {data?.summary?.total ?? 0}
                </span>
                <span className="mt-1 text-xs font-medium text-gray-500">Total</span>
              </div>
            </div>
          </div>

          <ul className="space-y-2.5 border-t border-gray-100 pt-4 text-xs">
            {segments.map((zone) => (
              <li key={zone.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span>{zone.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{zone.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal Nueva Convocatoria */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Nueva Convocatoria HPW
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Título
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cosecha Arándano Olmos"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Fecha de trabajo
                  </label>
                  <input
                    type="date"
                    required
                    value={form.fecha_trabajo}
                    onChange={(e) =>
                      setForm({ ...form, fecha_trabajo: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Turno
                  </label>
                  <select
                    value={form.turno}
                    onChange={(e) => setForm({ ...form, turno: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="MANANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                    <option value="NOCHE">Noche</option>
                    <option value="COMPLETO">Completo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Zona
                  </label>
                  <select
                    value={form.id_zona}
                    onChange={(e) => setForm({ ...form, id_zona: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="">Seleccionar</option>
                    {zonas.map((z) => (
                      <option key={z.id_zona} value={z.id_zona}>
                        {z.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Distrito
                  </label>
                  <select
                    value={form.id_distrito}
                    onChange={(e) =>
                      setForm({ ...form, id_distrito: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="">Seleccionar</option>
                    {distritos.map((d) => (
                      <option key={d.id_distrito} value={d.id_distrito}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Requeridos
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej. 150"
                    value={form.trabajadores_requeridos}
                    onChange={(e) =>
                      setForm({ ...form, trabajadores_requeridos: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Estado
                  </label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="PROGRAMADA">Programada</option>
                    <option value="ENVIADA">Enviada</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="BORRADOR">Borrador</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#147a3f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {selectedItem.titulo}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-gray-600">
              <p><strong className="text-gray-800">Campaña:</strong> {selectedItem.campana || '—'}</p>
              <p><strong className="text-gray-800">Fecha:</strong> {selectedItem.fecha}</p>
              <p><strong className="text-gray-800">Turno:</strong> {selectedItem.turno}</p>
              <p><strong className="text-gray-800">Zona:</strong> {selectedItem.zona}</p>
              <p><strong className="text-gray-800">Distrito:</strong> {selectedItem.distrito}</p>
              <p><strong className="text-gray-800">Requeridos:</strong> {selectedItem.trabajadores_requeridos}</p>
              <p><strong className="text-gray-800">Estado:</strong> {selectedItem.estado}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg bg-[#0b3d2c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093221] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
