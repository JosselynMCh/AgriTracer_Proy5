import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import GoogleMapView from '../common/GoogleMapView'
import LoadingOverlay from '../common/LoadingOverlay'

const BUS_ESTADO_STYLE = {
  EN_RUTA: { label: 'En Ruta', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-600' },
  ASIGNADO: { label: 'Asignado', cls: 'bg-sky-100 text-sky-700', dot: 'bg-sky-600' },
  DISPONIBLE: { label: 'Disponible', cls: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
  MANTENIMIENTO: { label: 'Mantenimiento', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-600' },
  INACTIVO: { label: 'Inactivo', cls: 'bg-red-100 text-red-700', dot: 'bg-red-600' },
}

export default function SeguimientoGpsSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busFilter, setBusFilter] = useState('ALL')
  const [selectedBusId, setSelectedBusId] = useState(null)

  const loadGps = useCallback(async () => {
    try {
      const res = await apiFetch('/api/gps')
      setData(res)
      setError('')
      if (res.buses?.length > 0) {
        setSelectedBusId((prev) => prev ?? res.buses[0].bus_id)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/gps')
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError('')
          if (res.buses?.length > 0) {
            setSelectedBusId((prev) => prev ?? res.buses[0].bus_id)
          }
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

  const buses = useMemo(() => data?.buses || [], [data])
  const filteredBuses =
    busFilter === 'ALL'
      ? buses
      : buses.filter((b) => String(b.bus_id) === busFilter)

  const activeBus =
    buses.find((b) => b.bus_id === selectedBusId) || filteredBuses[0] || null
  const summary = data?.summary || {}

  const gpsMarkers = useMemo(
    () =>
      filteredBuses
        .filter((b) => b.latitud !== null && b.longitud !== null)
        .map((b) => {
          const isActive = activeBus?.bus_id === b.bus_id
          return {
            lat: Number(b.latitud),
            lng: Number(b.longitud),
            title: `${b.codigo_bus} (${b.placa})`,
            color: isActive ? '#1d4ed8' : '#0b3d2c',
            scale: isActive ? 10 : 7.5,
            info: `<strong>${b.codigo_bus}</strong><br/>Placa: ${b.placa}<br/>Velocidad: ${b.velocidad_kmh} km/h`,
          }
        }),
    [filteredBuses, activeBus]
  )

  const mapCenter =
    activeBus?.latitud && activeBus?.longitud
      ? { lat: Number(activeBus.latitud), lng: Number(activeBus.longitud) }
      : { lat: -6.25, lng: -79.85 }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading} />
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#0b4f34]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
        </span>
        <h1 className="text-xl font-bold text-gray-900">Seguimiento GPS</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={busFilter}
          onChange={(e) => {
            const val = e.target.value
            setBusFilter(val)
            if (val !== 'ALL') setSelectedBusId(Number(val))
          }}
          aria-label="Filtrar por bus"
          className="w-full sm:w-auto sm:min-w-[180px] rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-2xs outline-none focus:border-[#147a3f]"
        >
          <option value="ALL">Todos los Buses</option>
          {buses.map((bus) => (
            <option key={bus.bus_id} value={bus.bus_id}>
              {bus.codigo_bus} ({bus.placa})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={loadGps}
          className="rounded-lg bg-[#147a3f] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-6 relative min-h-[290px] overflow-hidden rounded-xl border border-gray-200/80 bg-[#edf3e2] shadow-xs">
          <GoogleMapView
            center={mapCenter}
            zoom={10}
            markers={gpsMarkers}
            className="h-full w-full min-h-[290px]"
          />

          {activeBus && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-xl border border-gray-200 bg-white/95 px-4 py-2 shadow-lg flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#0b4f34]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z" />
                </svg>
              </div>
              <div className="leading-tight">
                <p className="text-xs sm:text-sm font-bold text-gray-900">
                  {activeBus.codigo_bus} ({activeBus.placa})
                </p>
                <p className="text-[11px] font-medium text-gray-500">
                  {BUS_ESTADO_STYLE[activeBus.estado_bus]?.label || activeBus.estado_bus} &bull;{' '}
                  {activeBus.velocidad_kmh} km/h
                  {activeBus.latitud && activeBus.longitud
                    ? ` (${Number(activeBus.latitud).toFixed(3)}, ${Number(activeBus.longitud).toFixed(3)})`
                    : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900">
              Estado de Buses
            </h2>
            <button
              type="button"
              onClick={() => setBusFilter('ALL')}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              Ver todos →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-2.5 pr-3">Bus</th>
                  <th className="py-2.5 pr-3">Placa</th>
                  <th className="py-2.5 pr-3">Estado</th>
                  <th className="py-2.5 pr-3">Ruta / Destino</th>
                  <th className="py-2.5 text-right">Última Actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredBuses.map((bus) => {
                  const st = BUS_ESTADO_STYLE[bus.estado_bus] || {
                    label: bus.estado_bus,
                    cls: 'bg-gray-100 text-gray-700',
                    dot: 'bg-gray-500',
                  }
                  const isSelected = activeBus?.bus_id === bus.bus_id
                  return (
                    <tr
                      key={bus.bus_id}
                      onClick={() => setSelectedBusId(bus.bus_id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50/70' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <td className="py-3.5 pr-3 font-semibold text-gray-900 whitespace-nowrap">
                        {bus.codigo_bus}
                      </td>
                      <td className="py-3.5 pr-3 whitespace-nowrap">{bus.placa}</td>
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 font-medium text-gray-800">
                        {bus.ruta_nombre || bus.proveedor_gps || 'Sin ruta activa'}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap text-gray-600">
                        {bus.hora_actualizacion ? `${bus.hora_actualizacion} h` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803d]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Buses en Ruta</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.busesEnRuta ?? 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Llegadas a Tiempo</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.llegadasATiempo ?? 100}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Retraso Promedio</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.retrasoPromedio || '2 min'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
