import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import GoogleMapView from '../common/GoogleMapView'
import LoadingOverlay from '../common/LoadingOverlay'

const ROUTE_COLORS = ['#15803d', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#0d9488']

const EMPTY_FORM = {
  nombre: '',
  descripcion_origen: '',
  descripcion_destino: '',
  distancia_estimada_km: '',
  duracion_estimada_minutos: '',
  esta_activo: true,
  origen_coords: null,
  destino_coords: null,
}

export default function RutasTransporteSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mapMode, setMapMode] = useState('Ruta')
  const [focusedRouteId, setFocusedRouteId] = useState(null)
  const [detailRoute, setDetailRoute] = useState(null)

  // Modal Nueva / Editar Ruta
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingRouteId, setEditingRouteId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pickingPoint, setPickingPoint] = useState('origen') // 'origen' | 'destino'
  const [saving, setSaving] = useState(false)

  const reloadRutas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/rutas')
      setData(res)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/rutas')
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

  const summary = data?.summary || {}
  const rutas = useMemo(() => data?.rutas || [], [data])
  const allParaderos = useMemo(() => data?.paraderos || [], [data])
  const buses = useMemo(() => data?.buses || [], [data])

  const { polylines, markers } = useMemo(() => {
    const visibleParaderos = focusedRouteId
      ? allParaderos.filter((p) => Number(p.id_ruta) === Number(focusedRouteId))
      : allParaderos

    const byRoute = new Map()
    visibleParaderos.forEach((p) => {
      if (!byRoute.has(p.id_ruta)) byRoute.set(p.id_ruta, [])
      byRoute.get(p.id_ruta).push(p)
    })

    const lines = Array.from(byRoute.values()).map((stops, idx) => ({
      path: stops.map((s) => ({ lat: s.latitud, lng: s.longitud })),
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      weight: focusedRouteId ? 5 : mapMode === 'Ruta' ? 4 : 2.5,
      opacity: mapMode === 'Ruta' ? 0.95 : 0.45,
    }))

    const stopMarkers =
      mapMode === 'Ruta'
        ? Array.from(byRoute.values()).flatMap((stops) =>
            stops.map((s, idx) => {
              const isFirst = idx === 0
              const isLast = idx === stops.length - 1 && stops.length > 1
              return {
                lat: s.latitud,
                lng: s.longitud,
                title: s.nombre_paradero,
                label: String(s.orden_paradero),
                color: isFirst ? '#16a34a' : isLast ? '#dc2626' : '#f97316',
                scale: focusedRouteId ? 12 : 10,
                zIndex: 10,
                info: `<strong>${s.nombre_paradero}</strong><br/>Paradero #${s.orden_paradero}`,
              }
            })
          )
        : []

    const busMarkers = buses
      .filter((b) => typeof b.latitud === 'number' && typeof b.longitud === 'number')
      .map((b) => ({
        lat: b.latitud,
        lng: b.longitud,
        title: `${b.codigo_bus} (${b.numero_placa})`,
        label: 'B',
        color: '#0b3d2c',
        scale: mapMode === 'Buses' ? 12 : 9,
        zIndex: 20,
        info: `<strong>${b.codigo_bus}</strong><br/>Placa: ${b.numero_placa}<br/>Estado: ${b.estado_bus}`,
      }))

    return {
      polylines: lines,
      markers: [...stopMarkers, ...busMarkers],
    }
  }, [allParaderos, buses, focusedRouteId, mapMode])

  // Marcadores y línea de vista previa dentro del modal de Nueva Ruta
  const pickerMarkers = useMemo(() => {
    const list = []
    if (form.origen_coords) {
      list.push({
        lat: form.origen_coords.lat,
        lng: form.origen_coords.lng,
        title: 'Origen (A)',
        label: 'A',
        color: '#16a34a',
        scale: 12,
      })
    }
    if (form.destino_coords) {
      list.push({
        lat: form.destino_coords.lat,
        lng: form.destino_coords.lng,
        title: 'Destino (B)',
        label: 'B',
        color: '#dc2626',
        scale: 12,
      })
    }
    return list
  }, [form.origen_coords, form.destino_coords])

  const pickerPolylines = useMemo(() => {
    if (form.origen_coords && form.destino_coords) {
      return [
        {
          path: [form.origen_coords, form.destino_coords],
          color: '#147a3f',
          weight: 4,
        },
      ]
    }
    return []
  }, [form.origen_coords, form.destino_coords])

  const openCreateModal = () => {
    setEditingRouteId(null)
    setForm(EMPTY_FORM)
    setPickingPoint('origen')
    setShowFormModal(true)
  }

  const openEditModal = (route) => {
    setEditingRouteId(route.id_ruta)
    setForm({
      nombre: route.nombre || '',
      descripcion_origen: route.descripcion_origen || '',
      descripcion_destino: route.descripcion_destino || '',
      distancia_estimada_km: route.distancia_estimada_km ?? '',
      duracion_estimada_minutos: route.duracion_estimada_minutos ?? '',
      esta_activo: Boolean(route.esta_activo),
      origen_coords: null,
      destino_coords: null,
    })
    setShowFormModal(true)
  }

  const handleSaveRoute = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.descripcion_origen.trim() || !form.descripcion_destino.trim()) {
      return
    }

    try {
      setSaving(true)
      if (editingRouteId) {
        await apiFetch(`/api/rutas/${editingRouteId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/api/rutas', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      setShowFormModal(false)
      await reloadRutas()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const kpiItems = [
    {
      id: 'buses',
      label: 'Buses Activos',
      value: `${summary.busesActivos ?? 0} / ${summary.totalBuses ?? 0}`,
      icon: 'bus',
    },
    {
      id: 'rutas',
      label: 'Rutas Activas',
      value: `${summary.rutasActivas ?? 0} / ${summary.totalRutas ?? 0}`,
      icon: 'route',
    },
    {
      id: 'costo',
      label: 'Costo Promedio',
      value: `S/. ${Number(summary.costoPromedio || 0).toFixed(2)}`,
      icon: 'bus',
    },
  ]

  const detailStops = detailRoute
    ? allParaderos.filter((p) => Number(p.id_ruta) === Number(detailRoute.id_ruta))
    : []

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading || saving} />
      {/* Encabezado + Botón Nueva Ruta */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#0b4f34]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z" />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-gray-900">Rutas y Transporte</h1>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#147a3f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
        >
          <span className="text-base leading-none">+</span>
          <span>Nueva Ruta</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpiItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100/80 text-[#15803d]">
              {item.icon === 'route' ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a4 4 0 0 0-4 4c0 2.5 4 7 4 7s4-4.5 4-7a4 4 0 0 0-4-4Zm0 5.5A1.5 1.5 0 1 1 12 4.5a1.5 1.5 0 0 1 0 3ZM6 15a2 2 0 1 0 0 4h4v2h4v-2h4a2 2 0 1 0 0-4H6Z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z" />
                </svg>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">{item.label}</p>
              <span className="mt-0.5 block text-2xl font-bold text-gray-900">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla + Mapa */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">
                Rutas Disponibles
              </h2>
              <p className="text-[11px] text-gray-400">
                Haz clic en una ruta para enfocar sus paraderos en el mapa
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFocusedRouteId(null)}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              {focusedRouteId ? 'Ver todas →' : `${rutas.length} rutas`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-2.5 pr-3">Nombre de Ruta</th>
                  <th className="py-2.5 pr-3">Origen - Destino</th>
                  <th className="py-2.5 pr-3">Distancia (km)</th>
                  <th className="py-2.5 pr-3">Estado</th>
                  <th className="py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {rutas.map((route) => {
                  const isFocused = Number(focusedRouteId) === Number(route.id_ruta)
                  return (
                    <tr
                      key={route.id_ruta}
                      onClick={() =>
                        setFocusedRouteId(isFocused ? null : route.id_ruta)
                      }
                      className={`cursor-pointer transition ${
                        isFocused ? 'bg-emerald-50/80' : 'hover:bg-gray-50/70'
                      }`}
                    >
                      <td className="py-3.5 pr-3 font-medium text-gray-900 whitespace-nowrap">
                        {route.nombre}
                      </td>
                      <td className="py-3.5 pr-3">
                        {route.descripcion_origen} - {route.descripcion_destino}
                      </td>
                      <td className="py-3.5 pr-3 font-medium">
                        {route.distancia_estimada_km ?? '—'}
                      </td>
                      <td className="py-3.5 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            route.esta_activo
                              ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
                              : 'border border-gray-200 bg-gray-100 text-gray-600'
                          }`}
                        >
                          {route.esta_activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 text-[#0284c7]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailRoute(route)
                            }}
                            aria-label={`Ver ${route.nombre}`}
                            className="rounded p-1 hover:bg-sky-50 cursor-pointer"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(route)
                            }}
                            aria-label={`Editar ${route.nombre}`}
                            className="rounded p-1 hover:bg-sky-50 cursor-pointer"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mapa de Rutas */}
        <div className="xl:col-span-5 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900">
              Mapa de Rutas
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" /> Origen
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" /> Destino
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0b3d2c]" /> Bus
              </span>
            </div>
          </div>

          <div className="relative flex-1 min-h-[280px] overflow-hidden rounded-xl border border-gray-100 bg-[#e6eef6]">
            <div className="absolute right-3 top-3 z-10 inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMapMode('Ruta')}
                className={`rounded-md px-3 py-1 transition cursor-pointer ${
                  mapMode === 'Ruta'
                    ? 'bg-emerald-100 text-[#15803d]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ruta
              </button>
              <button
                type="button"
                onClick={() => setMapMode('Buses')}
                className={`rounded-md px-3 py-1 transition cursor-pointer ${
                  mapMode === 'Buses'
                    ? 'bg-emerald-100 text-[#15803d]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Buses
              </button>
            </div>

            <GoogleMapView
              center={{ lat: -6.25, lng: -79.85 }}
              zoom={8}
              polylines={polylines}
              markers={markers}
              className="h-full w-full min-h-[280px]"
            />
          </div>
        </div>
      </div>

      {/* Modal Registrar / Editar Ruta con selector en mapa */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingRouteId ? 'Editar Ruta' : 'Registrar Nueva Ruta'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nombre de la Ruta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ruta Norte Express"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Origen
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Olmos"
                    value={form.descripcion_origen}
                    onChange={(e) =>
                      setForm({ ...form, descripcion_origen: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Destino
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Fundo Agrovisión"
                    value={form.descripcion_destino}
                    onChange={(e) =>
                      setForm({ ...form, descripcion_destino: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Distancia (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ej. 65.4"
                    value={form.distancia_estimada_km}
                    onChange={(e) =>
                      setForm({ ...form, distancia_estimada_km: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Duración estimada (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 85"
                    value={form.duracion_estimada_minutos}
                    onChange={(e) =>
                      setForm({ ...form, duracion_estimada_minutos: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
              </div>

              {!editingRouteId && (
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Ubica los puntos en el mapa (haz clic sobre el mapa):
                    </span>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setPickingPoint('origen')}
                        className={`rounded-md px-2.5 py-1 cursor-pointer ${
                          pickingPoint === 'origen'
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-600'
                        }`}
                      >
                        Punto A (Origen)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickingPoint('destino')}
                        className={`rounded-md px-2.5 py-1 cursor-pointer ${
                          pickingPoint === 'destino'
                            ? 'bg-red-600 text-white'
                            : 'text-gray-600'
                        }`}
                      >
                        Punto B (Destino)
                      </button>
                    </div>
                  </div>

                  <div className="h-52 overflow-hidden rounded-lg border border-gray-200">
                    <GoogleMapView
                      center={{ lat: -6.25, lng: -79.85 }}
                      zoom={8}
                      fitToData={false}
                      markers={pickerMarkers}
                      polylines={pickerPolylines}
                      onMapClick={(coords) => {
                        if (pickingPoint === 'origen') {
                          setForm((prev) => ({ ...prev, origen_coords: coords }))
                          setPickingPoint('destino')
                        } else {
                          setForm((prev) => ({ ...prev, destino_coords: coords }))
                        }
                      }}
                      className="h-full w-full"
                    />
                  </div>

                  <div className="flex flex-wrap justify-between text-[11px] text-gray-500">
                    <span>
                      Origen A:{' '}
                      {form.origen_coords
                        ? `${form.origen_coords.lat}, ${form.origen_coords.lng}`
                        : 'Sin marcar'}
                    </span>
                    <span>
                      Destino B:{' '}
                      {form.destino_coords
                        ? `${form.destino_coords.lat}, ${form.destino_coords.lng}`
                        : 'Sin marcar'}
                    </span>
                  </div>
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.esta_activo}
                  onChange={(e) =>
                    setForm({ ...form, esta_activo: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#147a3f]"
                />
                <span>Ruta activa</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#147a3f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Guardando...' : editingRouteId ? 'Actualizar' : 'Guardar Ruta en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Ruta */}
      {detailRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {detailRoute.nombre}
              </h3>
              <button
                type="button"
                onClick={() => setDetailRoute(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-gray-600">
              <p><strong className="text-gray-800">Origen:</strong> {detailRoute.descripcion_origen}</p>
              <p><strong className="text-gray-800">Destino:</strong> {detailRoute.descripcion_destino}</p>
              <p><strong className="text-gray-800">Distancia:</strong> {detailRoute.distancia_estimada_km ?? '—'} km</p>
              <p><strong className="text-gray-800">Duración estimada:</strong> {detailRoute.duracion_estimada_minutos ?? '—'} min</p>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-800 mb-2">
                Paraderos ({detailStops.length})
              </p>
              {detailStops.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {detailStops.map((s) => (
                    <li key={s.id_paradero} className="flex items-center justify-between">
                      <span>
                        <strong>#{s.orden_paradero}</strong> {s.nombre_paradero}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {s.latitud.toFixed(4)}, {s.longitud.toFixed(4)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">Sin paraderos registrados.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailRoute(null)}
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
