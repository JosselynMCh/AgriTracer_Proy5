import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import LoadingOverlay from '../common/LoadingOverlay'

const BUS_BADGE = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-700',
  ASIGNADO: 'bg-sky-100 text-sky-700',
  EN_RUTA: 'bg-teal-100 text-teal-700',
  MANTENIMIENTO: 'bg-amber-100 text-amber-700',
  INACTIVO: 'bg-gray-100 text-gray-600',
}

const VIAJE_BADGE = {
  PROGRAMADO: 'bg-sky-100 text-sky-700',
  EN_CAMINO: 'bg-emerald-100 text-emerald-700',
  LLEGADA: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

export default function BusesSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal Registrar Bus
  const [showBusModal, setShowBusModal] = useState(false)
  const [busForm, setBusForm] = useState({
    numero_placa: '',
    codigo_interno: '',
    capacidad: '45',
    id_proveedor: '',
    id_dispositivo_gps: '',
    proveedor_gps: 'CERTISAT',
    estado_bus: 'DISPONIBLE',
  })

  // Modal Asignar Bus a Ruta
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({
    bus_id: '',
    id_ruta: '',
    id_convocatoria: '',
    pasajeros_previstos: '',
    fecha_hora_salida: '',
  })

  const reloadBuses = useCallback(async () => {
    try {
      const res = await apiFetch('/api/buses')
      setData(res)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/buses')
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
  const buses = data?.buses || []
  const viajes = data?.viajes || []
  const proveedores = data?.catalogos?.proveedores || []
  const rutas = data?.catalogos?.rutas || []
  const convocatorias = data?.catalogos?.convocatorias || []

  const selectedBusObj = buses.find(
    (b) => String(b.bus_id) === String(assignForm.bus_id)
  )

  const openAssignForBus = (bus) => {
    const defaultConv = convocatorias[0]
    const defaultCap = bus ? Number(bus.capacidad) : 40
    const suggestedPassengers = defaultConv
      ? Math.min(defaultCap, Number(defaultConv.trabajadores_requeridos))
      : defaultCap

    setAssignForm({
      bus_id: bus ? String(bus.bus_id) : buses[0] ? String(buses[0].bus_id) : '',
      id_ruta: rutas[0] ? String(rutas[0].id_ruta) : '',
      id_convocatoria: defaultConv ? String(defaultConv.id_convocatoria) : '',
      pasajeros_previstos: String(suggestedPassengers),
      fecha_hora_salida: '',
    })
    setShowAssignModal(true)
  }

  const handleCreateBus = async (e) => {
    e.preventDefault()
    if (!busForm.numero_placa.trim() || !busForm.capacidad) return

    try {
      setSaving(true)
      await apiFetch('/api/buses', {
        method: 'POST',
        body: JSON.stringify(busForm),
      })
      setShowBusModal(false)
      setBusForm({
        numero_placa: '',
        codigo_interno: '',
        capacidad: '45',
        id_proveedor: '',
        id_dispositivo_gps: '',
        proveedor_gps: 'CERTISAT',
        estado_bus: 'DISPONIBLE',
      })
      await reloadBuses()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAssignBus = async (e) => {
    e.preventDefault()
    if (!assignForm.bus_id || !assignForm.id_ruta || !assignForm.id_convocatoria) {
      return
    }

    try {
      setSaving(true)
      await apiFetch('/api/buses/asignar', {
        method: 'POST',
        body: JSON.stringify(assignForm),
      })
      setShowAssignModal(false)
      await reloadBuses()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading || saving} />
      {/* Encabezado + Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#0b4f34]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z" />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Buses y Asignación</h1>
            <p className="text-xs text-gray-500">
              Registra unidades con su capacidad de asientos y asígnalas a rutas y convocatorias
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openAssignForBus(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-[#147a3f] shadow-2xs transition hover:bg-emerald-50 cursor-pointer"
          >
            <span>Asignar Bus a Ruta</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBusModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#147a3f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
          >
            <span className="text-base leading-none">+</span>
            <span>Registrar Bus</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Total Buses</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.totalBuses ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Disponibles</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {summary.disponibles ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Asignados / En Ruta</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">
            {summary.asignadosEnRuta ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Capacidad Total (Asientos)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary.totalAsientos ?? 0}
          </p>
        </div>
      </div>

      {/* Flota de Buses */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">
            Flota de Buses Registrados
          </h2>
          <span className="text-xs text-gray-400">{buses.length} unidades</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                <th className="py-2.5 pr-3">Código</th>
                <th className="py-2.5 pr-3">Placa</th>
                <th className="py-2.5 pr-3">Proveedor</th>
                <th className="py-2.5 pr-3">Asientos</th>
                <th className="py-2.5 pr-3">GPS</th>
                <th className="py-2.5 pr-3">Estado</th>
                <th className="py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {buses.map((bus) => (
                <tr key={bus.bus_id} className="hover:bg-gray-50/70">
                  <td className="py-3 pr-3 font-semibold text-gray-900 whitespace-nowrap">
                    {bus.codigo_interno}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">{bus.numero_placa}</td>
                  <td className="py-3 pr-3">{bus.proveedor}</td>
                  <td className="py-3 pr-3 font-bold text-[#0b3d2c]">
                    {bus.capacidad} asientos
                  </td>
                  <td className="py-3 pr-3 text-gray-500">
                    {bus.id_dispositivo_gps || bus.proveedor_gps || '—'}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        BUS_BADGE[bus.estado_bus] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {bus.estado_bus}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openAssignForBus(bus)}
                      className="rounded-lg border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-[#147a3f] hover:bg-emerald-50 cursor-pointer"
                    >
                      Asignar a ruta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asignaciones a Rutas */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">
            Asignaciones de Buses a Rutas (Viajes)
          </h2>
          <span className="text-xs text-gray-400">{viajes.length} viajes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                <th className="py-2.5 pr-3">Bus</th>
                <th className="py-2.5 pr-3">Ruta</th>
                <th className="py-2.5 pr-3">Convocatoria</th>
                <th className="py-2.5 pr-3">Ocupación (Asientos)</th>
                <th className="py-2.5 pr-3">Salida</th>
                <th className="py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {viajes.map((v) => {
                const pct =
                  v.capacidad > 0
                    ? Math.min(100, Math.round((v.pasajeros_previstos / v.capacidad) * 100))
                    : 0
                return (
                  <tr key={v.id_viaje} className="hover:bg-gray-50/70">
                    <td className="py-3 pr-3 font-semibold text-gray-900 whitespace-nowrap">
                      {v.codigo_bus} ({v.numero_placa})
                    </td>
                    <td className="py-3 pr-3 font-medium">{v.ruta_nombre}</td>
                    <td className="py-3 pr-3">{v.convocatoria_titulo}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 whitespace-nowrap">
                          {v.pasajeros_previstos} / {v.capacidad}
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#147a3f]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-gray-500">
                      {v.salida || '—'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          VIAJE_BADGE[v.estado_viaje] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {v.estado_viaje}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Bus */}
      {showBusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Registrar Bus</h3>
              <button
                type="button"
                onClick={() => setShowBusModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBus} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Número de Placa
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. T4-527"
                    value={busForm.numero_placa}
                    onChange={(e) =>
                      setBusForm({ ...busForm, numero_placa: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. BX-105"
                    value={busForm.codigo_interno}
                    onChange={(e) =>
                      setBusForm({ ...busForm, codigo_interno: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Capacidad (Asientos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={busForm.capacidad}
                    onChange={(e) =>
                      setBusForm({ ...busForm, capacidad: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Proveedor
                  </label>
                  <select
                    value={busForm.id_proveedor}
                    onChange={(e) =>
                      setBusForm({ ...busForm, id_proveedor: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="">Seleccionar</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.razon_social}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    ID Dispositivo GPS
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. GPS-007"
                    value={busForm.id_dispositivo_gps}
                    onChange={(e) =>
                      setBusForm({ ...busForm, id_dispositivo_gps: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Estado Inicial
                  </label>
                  <select
                    value={busForm.estado_bus}
                    onChange={(e) =>
                      setBusForm({ ...busForm, estado_bus: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBusModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#147a3f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Bus en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Bus a Ruta */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Asignar Bus a Ruta
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignBus} className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Bus (según capacidad de asientos)
                </label>
                <select
                  required
                  value={assignForm.bus_id}
                  onChange={(e) => {
                    const nextBus = buses.find(
                      (b) => String(b.bus_id) === e.target.value
                    )
                    setAssignForm({
                      ...assignForm,
                      bus_id: e.target.value,
                      pasajeros_previstos: nextBus
                        ? String(nextBus.capacidad)
                        : assignForm.pasajeros_previstos,
                    })
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                >
                  <option value="">Seleccionar bus</option>
                  {buses.map((b) => (
                    <option key={b.bus_id} value={b.bus_id}>
                      {b.codigo_interno} ({b.numero_placa}) — {b.capacidad} asientos [{b.estado_bus}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Ruta
                </label>
                <select
                  required
                  value={assignForm.id_ruta}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, id_ruta: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                >
                  <option value="">Seleccionar ruta</option>
                  {rutas.map((r) => (
                    <option key={r.id_ruta} value={r.id_ruta}>
                      {r.nombre} ({r.descripcion_origen} - {r.descripcion_destino})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Convocatoria
                </label>
                <select
                  required
                  value={assignForm.id_convocatoria}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      id_convocatoria: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                >
                  <option value="">Seleccionar convocatoria</option>
                  {convocatorias.map((c) => (
                    <option key={c.id_convocatoria} value={c.id_convocatoria}>
                      {c.titulo} ({c.fecha}) — Req: {c.trabajadores_requeridos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Pasajeros previstos
                    {selectedBusObj ? ` (Máx ${selectedBusObj.capacidad})` : ''}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedBusObj?.capacidad || 999}
                    required
                    value={assignForm.pasajeros_previstos}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        pasajeros_previstos: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Fecha/Hora Salida
                  </label>
                  <input
                    type="datetime-local"
                    value={assignForm.fecha_hora_salida}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        fecha_hora_salida: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#147a3f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
