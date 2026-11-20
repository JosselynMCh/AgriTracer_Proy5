import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import LoadingOverlay from '../common/LoadingOverlay'
import WorkerPerformanceModal from './WorkerPerformanceModal'

const HPW_BADGE = {
  HPW: { label: 'HPW', cls: 'bg-sky-100 text-sky-700' },
  NO_HPW: { label: 'No HPW', cls: 'bg-orange-100 text-orange-700' },
  NO_CLASIFICADO: { label: 'Sin evaluar', cls: 'bg-gray-100 text-gray-600' },
}

export default function TrabajadoresSection() {
  const [workers, setWorkers] = useState([])
  const [distritos, setDistritos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [selectedId, setSelectedId] = useState(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)

  const openDetailForWorker = async (worker) => {
    setSelectedId(worker.id_trabajador)
    setShowDetailModal(true)
    setLoadingDetail(true)
    setDetailData(null)
    try {
      const res = await apiFetch(`/api/trabajadores/${worker.id_trabajador}/detalle`)
      setDetailData(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }
  const [form, setForm] = useState({
    numero_documento: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    id_distrito: '',
    estado_trabajador: 'ACTIVO',
  })

  const loadWorkers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/trabajadores')
      setWorkers(res.items || [])
      setDistritos(res.distritos || [])
      setError('')
      if (res.items?.length > 0) {
        setSelectedId((prev) => prev ?? res.items[0].id_trabajador)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/trabajadores')
      .then((res) => {
        if (!cancelled) {
          setWorkers(res.items || [])
          setDistritos(res.distritos || [])
          setError('')
          if (res.items?.length > 0) {
            setSelectedId((prev) => prev ?? res.items[0].id_trabajador)
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

  const districtNames = ['Todos', ...new Set(workers.map((w) => w.distrito))]

  const filteredWorkers = workers.filter((w) => {
    const fullName = `${w.nombres} ${w.apellidos}`.toLowerCase()
    const matchesSearch =
      w.numero_documento.includes(search.trim()) ||
      fullName.includes(search.trim().toLowerCase())
    const matchesDistrict =
      districtFilter === 'Todos' || w.distrito === districtFilter
    const matchesStatus =
      statusFilter === 'Todos' || w.estado_trabajador === statusFilter
    return matchesSearch && matchesDistrict && matchesStatus
  })

  const selectedWorker =
    workers.find((w) => w.id_trabajador === selectedId) ||
    filteredWorkers[0] ||
    workers[0] ||
    null

  const getInitials = (w) =>
    `${w?.nombres?.[0] || ''}${w?.apellidos?.[0] || ''}`.toUpperCase()

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.numero_documento.trim() || !form.nombres.trim() || !form.apellidos.trim()) return

    try {
      setSaving(true)
      const res = await apiFetch('/api/trabajadores', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          id_distrito: form.id_distrito ? Number(form.id_distrito) : null,
        }),
      })
      setShowRegisterModal(false)
      setForm({
        numero_documento: '',
        nombres: '',
        apellidos: '',
        telefono: '',
        id_distrito: '',
        estado_trabajador: 'ACTIVO',
      })
      await loadWorkers()
      if (res.id_trabajador) setSelectedId(res.id_trabajador)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading || saving || loadingDetail} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2.5 sm:flex-1">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar trabajador por DNI o nombre..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-3.5 pr-9 text-xs sm:text-sm text-gray-800 placeholder-gray-400 shadow-2xs outline-none focus:border-[#147a3f]"
            />
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
          </div>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            aria-label="Filtrar por distrito"
            className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-2xs outline-none focus:border-[#147a3f]"
          >
            {districtNames.map((dist) => (
              <option key={dist} value={dist}>
                {dist === 'Todos' ? 'Todos los distritos' : dist}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
            className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-2xs outline-none focus:border-[#147a3f]"
          >
            <option value="Todos">Estado</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="SUSPENDIDO">Suspendido</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#147a3f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
        >
          <span className="text-base leading-none">+</span>
          <span>Registrar</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-9 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-2.5 pr-3">DNI</th>
                  <th className="py-2.5 pr-3">Nombres y Apellidos</th>
                  <th className="py-2.5 pr-3">Distrito</th>
                  <th className="py-2.5 pr-3">Clasificación HPW</th>
                  <th className="py-2.5 pr-3">Estado</th>
                  <th className="py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredWorkers.map((worker) => {
                  const isSelected = selectedWorker?.id_trabajador === worker.id_trabajador
                  const hpwInfo = HPW_BADGE[worker.clasificacion_hpw] || HPW_BADGE.NO_CLASIFICADO
                  return (
                    <tr
                      key={worker.id_trabajador}
                      onClick={() => setSelectedId(worker.id_trabajador)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50/60' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <td className="py-3.5 pr-3 font-medium text-gray-800 whitespace-nowrap">
                        {worker.numero_documento}
                      </td>
                      <td className="py-3.5 pr-3 font-medium text-gray-900 whitespace-nowrap">
                        {worker.nombres} {worker.apellidos}
                      </td>
                      <td className="py-3.5 pr-3">{worker.distrito}</td>
                      <td className="py-3.5 pr-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${hpwInfo.cls}`}>
                          {hpwInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            worker.estado_trabajador === 'ACTIVO'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {worker.estado_trabajador === 'ACTIVO' ? 'Activo' : worker.estado_trabajador}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetailForWorker(worker)
                          }}
                          aria-label={`Ver ${worker.nombres}`}
                          className="rounded p-1 text-[#0284c7] hover:bg-sky-50 cursor-pointer"
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

                {filteredWorkers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-500">
                      No se encontraron trabajadores con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedWorker && (
          <div className="xl:col-span-3 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col items-center text-center justify-between">
            <div className="w-full flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-[#0b3d2c] ring-4 ring-emerald-50">
                {getInitials(selectedWorker)}
              </div>

              <h3 className="mt-3 text-base font-bold text-gray-900">
                {selectedWorker.nombres} {selectedWorker.apellidos}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedWorker.tipo_documento}: {selectedWorker.numero_documento}
              </p>

              <span className="mt-2.5 inline-flex rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-700">
                {selectedWorker.estado_trabajador === 'ACTIVO' ? 'Activo' : selectedWorker.estado_trabajador}
              </span>

              <div className="mt-4 w-full rounded-xl bg-gray-50 p-3.5 text-left text-xs space-y-2 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">◉</span>
                  <span>
                    Zona: <strong className="text-gray-900">{selectedWorker.zona}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">📍</span>
                  <span>
                    Distrito: <strong className="text-gray-900">{selectedWorker.distrito}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">👤</span>
                  <span>
                    HPW:{' '}
                    <strong className="text-gray-900">
                      {selectedWorker.clasificacion_hpw === 'HPW' ? 'Sí' : 'No'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openDetailForWorker(selectedWorker)}
              className="mt-4 w-full rounded-lg border border-emerald-200 py-2 text-xs font-semibold text-[#15803d] transition hover:bg-emerald-50 cursor-pointer"
            >
              Ver Detalle
            </button>
          </div>
        )}
      </div>

      {/* Modal Registrar Trabajador */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Registrar Trabajador
              </h3>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">DNI</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="Ej. 74852369"
                    value={form.numero_documento}
                    onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. 987654321"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Nombres</label>
                  <input
                    type="text"
                    required
                    value={form.nombres}
                    onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Distrito</label>
                  <select
                    value={form.id_distrito}
                    onChange={(e) => setForm({ ...form, id_distrito: e.target.value })}
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
                  <select
                    value={form.estado_trabajador}
                    onChange={(e) => setForm({ ...form, estado_trabajador: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#147a3f]"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                    <option value="SUSPENDIDO">Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
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

      {/* Modal Detalle de Rendimiento */}
      {showDetailModal && selectedWorker && (
        <WorkerPerformanceModal
          worker={selectedWorker}
          detailData={detailData}
          loading={loadingDetail}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  )
}
