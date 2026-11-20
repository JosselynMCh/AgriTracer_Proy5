import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import { exportPrediccionToPdf } from '../../utils/exportPrediccionPdf'
import GoogleMapView from '../common/GoogleMapView'
import LoadingOverlay from '../common/LoadingOverlay'
import WorkerPerformanceModal from '../trabajadores/WorkerPerformanceModal'

function buildWhatsAppUrl(phone, worker, campanaTitulo) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  const normalized = digits.length === 9 ? `51${digits}` : digits
  const text = encodeURIComponent(
    `Hola ${worker.nombres}, te contactamos de Agrovisión (Agri-Tracer) por la campaña "${
      campanaTitulo || 'próxima campaña'
    }".`
  )
  return `https://wa.me/${normalized}?text=${text}`
}

export default function PrediccionSection() {
  const [selectedConvId, setSelectedConvId] = useState('')
  const [loadedKey, setLoadedKey] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [detailWorker, setDetailWorker] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const queryKey = selectedConvId || 'default'

  useEffect(() => {
    let cancelled = false
    const qs = selectedConvId ? `?id_convocatoria=${selectedConvId}` : ''
    apiFetch(`/api/prediccion${qs}`)
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setLoadedKey(queryKey)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadedKey(queryKey)
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedConvId, queryKey])

  const loading = loadedKey !== queryKey && !error

  const convocatorias = data?.convocatorias || []
  const selectedConv = data?.selectedConvocatoria
  const resumen = data?.resumen || {}
  const mejoresTrabajadores = data?.mejoresTrabajadores || []
  const busesDisponibles = data?.busesDisponibles || []
  const busesRecomendados = data?.busesRecomendados || []
  const informeOptimizacion = data?.informeOptimizacion || {}
  const empresaRecomendada = data?.empresaRecomendada
  const rutaRecomendada = data?.rutaRecomendada

  const recommendedBusIds = new Set(busesRecomendados.map((b) => b.bus_id))

  const { polylines, markers } = useMemo(() => {
    const paraderos = rutaRecomendada?.paraderos || []
    if (paraderos.length === 0) {
      return { polylines: [], markers: [] }
    }

    const lines = [
      {
        path: paraderos.map((p) => ({ lat: p.latitud, lng: p.longitud })),
        color: '#147a3f',
        weight: 5,
      },
    ]

    const stopMarkers = paraderos.map((p, idx) => {
      const isFirst = idx === 0
      const isLast = idx === paraderos.length - 1 && paraderos.length > 1
      return {
        lat: p.latitud,
        lng: p.longitud,
        title: p.nombre_paradero,
        label: String(p.orden_paradero),
        color: isFirst ? '#16a34a' : isLast ? '#dc2626' : '#f97316',
        scale: 12,
        info: `<strong>${p.nombre_paradero}</strong><br/>Paradero #${p.orden_paradero}`,
      }
    })

    return { polylines: lines, markers: stopMarkers }
  }, [rutaRecomendada])

  const handleExportPdf = () => {
    if (!selectedConv) return
    exportPrediccionToPdf({
      selectedConv,
      resumen,
      informeOptimizacion,
      busesRecomendados,
      empresaRecomendada,
      busesDisponibles,
      rutaRecomendada,
      mejoresTrabajadores,
    })
  }

  const openWorkerDetail = async (worker) => {
    setDetailWorker(worker)
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

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading || loadingDetail} />

      {/* Encabezado + Selector de campaña */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#147a3f]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z" />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Predicción Operativa y Campamentos Olmos
            </h1>
            <p className="text-xs text-gray-500">
              Selecciona una campaña registrada para predecir personal HPW, flota disponible, contratación y ruta de recojo hacia Olmos
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          <select
            value={selectedConvId || selectedConv?.id_convocatoria || ''}
            onChange={(e) => setSelectedConvId(e.target.value)}
            aria-label="Seleccionar campaña"
            className="w-full sm:w-auto sm:min-w-[230px] rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-800 shadow-2xs outline-none focus:border-[#147a3f]"
          >
            {convocatorias.map((c) => (
              <option key={c.id_convocatoria} value={c.id_convocatoria}>
                {c.titulo} ({c.fecha}) — Req: {c.trabajadores_requeridos}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!selectedConv || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>Exportar Predicción (PDF)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 4 Tarjetas resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Requeridos en Campaña</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {resumen.trabajadoresRequeridos ?? 0}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {selectedConv?.campana || 'Sin campaña'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Asientos en Buses Disponibles</p>
          <p className="mt-1 text-2xl font-bold text-[#147a3f]">
            {resumen.asientosDisponibles ?? 0}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {busesDisponibles.length} buses con estado DISPONIBLE
          </p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Buses Extra a Contratar</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              (resumen.busesExtraNecesarios ?? 0) > 0
                ? 'text-amber-600'
                : 'text-emerald-700'
            }`}
          >
            {resumen.busesExtraNecesarios ?? 0}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {(resumen.deficitAsientos ?? 0) > 0
              ? `Déficit de ${resumen.deficitAsientos} asientos`
              : 'Capacidad cubierta con flota actual'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">
            Hospedaje Campamento Olmos
          </p>
          <p className="mt-1 text-2xl font-bold text-sky-700">
            {resumen.trabajadoresParaCampamentoOlmos ?? 0}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Trabajadores de distritos lejanos
          </p>
        </div>
      </div>

      {/* Predicción de Flota y Empresa a Contratar + Ruta hacia Campamento Olmos */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Flota y Empresa recomendada */}
        <div className="xl:col-span-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-gray-900">
              Predicción de Buses y Contratación
            </h2>
            {informeOptimizacion.ahorroEstimado > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                Ahorro óptimo: S/. {informeOptimizacion.ahorroEstimado.toFixed(2)} ({informeOptimizacion.porcentajeAhorro}%)
              </span>
            )}
          </div>

          {/* Bus óptimo recomendado (Best-Fit) */}
          {busesRecomendados.length > 0 ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">
                Bus óptimo recomendado (capacidad similar sin desperdicio)
              </p>
              <p className="text-sm font-bold text-gray-900">
                {busesRecomendados
                  .map((b) => `${b.codigo_interno} (${b.capacidad} asientos)`)
                  .join(' + ')}
              </p>
              <p className="text-xs text-gray-600">
                Cubre <strong>{resumen.trabajadoresRequeridos}</strong> requeridos con{' '}
                <strong>{informeOptimizacion.ocupacionOptimaPct ?? 0}%</strong> de ocupación (
                {informeOptimizacion.asientosDesperdiciados ?? 0} asientos libres) &bull; Costo estimado:{' '}
                <strong>S/. {(informeOptimizacion.costoOptimo ?? 0).toFixed(2)}</strong>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
                Unidad de capacidad similar recomendada
              </p>
              <p className="text-sm font-bold text-gray-900">
                Contratar bus de {informeOptimizacion.capacidadSimilarObjetivo || resumen.trabajadoresRequeridos} asientos
              </p>
              <p className="text-xs text-gray-600">
                Para <strong>{resumen.trabajadoresRequeridos}</strong> requeridos, los buses propios disponibles tienen demasiados asientos vacíos; conviene una unidad de capacidad similar ({informeOptimizacion.ocupacionOptimaPct ?? 100}% ocupación).
              </p>
            </div>
          )}

          {/* Empresa recomendada */}
          {empresaRecomendada && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#0b3d2c]">
                  Empresa recomendada para contratar más buses
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {empresaRecomendada.total_buses} unidades registradas
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">
                {empresaRecomendada.razon_social}
              </p>
              <p className="text-xs text-gray-600">
                Contacto: <strong>{empresaRecomendada.nombre_contacto || '—'}</strong> &bull; Tel:{' '}
                <strong>{empresaRecomendada.telefono || '—'}</strong>
                {resumen.deficitAsientos > 0 && (
                  <>
                    {' '}
                    &bull; Contratar unidad óptima de{' '}
                    <strong>{informeOptimizacion.busExternoSugeridoCapacidad} asientos</strong>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Lista de buses disponibles */}
          <div>
            <p className="mb-2 text-xs font-bold text-gray-700">
              Buses Disponibles en Flota ({busesDisponibles.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                    <th className="py-2 pr-3">Bus</th>
                    <th className="py-2 pr-3">Placa</th>
                    <th className="py-2 pr-3">Proveedor</th>
                    <th className="py-2">Asientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {busesDisponibles.map((b) => {
                    const isOptimal = recommendedBusIds.has(b.bus_id)
                    return (
                      <tr
                        key={b.bus_id}
                        className={isOptimal ? 'bg-emerald-50/70' : ''}
                      >
                        <td className="py-2.5 pr-3 font-semibold text-gray-900 whitespace-nowrap">
                          {b.codigo_interno}
                          {isOptimal && (
                            <span className="ml-1.5 rounded-full bg-[#147a3f] px-2 py-0.5 text-[10px] font-bold text-white">
                              Óptimo
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">{b.numero_placa}</td>
                        <td className="py-2.5 pr-3">{b.proveedor}</td>
                        <td className="py-2.5 font-bold text-[#147a3f]">
                          {b.capacidad}
                        </td>
                      </tr>
                    )
                  })}
                  {busesDisponibles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        No hay buses con estado DISPONIBLE actualmente; se recomienda contratar unidades externas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ruta recomendada hacia campamentos de Olmos */}
        <div className="xl:col-span-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">
                Ruta Recomendada hacia Campamentos de Olmos
              </h2>
              <p className="text-xs text-gray-500">
                {rutaRecomendada
                  ? `${rutaRecomendada.nombre} (${rutaRecomendada.descripcion_origen} → ${rutaRecomendada.descripcion_destino})`
                  : 'Sin ruta activa registrada'}
              </p>
            </div>
            {rutaRecomendada?.distancia_estimada_km && (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                {rutaRecomendada.distancia_estimada_km} km
              </span>
            )}
          </div>

          <div className="h-56 overflow-hidden rounded-xl border border-gray-100">
            <GoogleMapView
              center={{ lat: -6.15, lng: -79.75 }}
              zoom={9}
              polylines={polylines}
              markers={markers}
              className="h-full w-full"
            />
          </div>

          {rutaRecomendada?.paraderos?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {rutaRecomendada.paraderos.map((p) => (
                <span
                  key={p.id_paradero}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                >
                  <strong className="text-[#147a3f]">#{p.orden_paradero}</strong>
                  <span>{p.nombre_paradero}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Informe de Optimización de Costos y Escenarios */}
      {informeOptimizacion.escenarios?.length > 0 && (
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">
                Informe de Optimización de Costos y Simulación de Decisiones
              </h2>
              <p className="text-xs text-gray-500">
                Comparativa basada en el costo promedio por asiento (S/.{' '}
                {Number(informeOptimizacion.costoPorAsiento || 0).toFixed(2)}) y qué pasaría si se elige otra alternativa
              </p>
            </div>
            {informeOptimizacion.ahorroEstimado > 0 && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-[#0b3d2c]">
                Reducción estimada: S/. {informeOptimizacion.ahorroEstimado.toFixed(2)} ({informeOptimizacion.porcentajeAhorro}%)
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {informeOptimizacion.escenarios.map((esc) => (
              <div
                key={esc.id}
                className={`rounded-xl border p-4 space-y-2 ${
                  esc.recomendado
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-gray-200 bg-gray-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-gray-900">{esc.titulo}</h3>
                  {esc.recomendado && (
                    <span className="shrink-0 rounded-full bg-[#147a3f] px-2 py-0.5 text-[10px] font-bold text-white">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-700">{esc.detalle}</p>
                <div className="flex items-baseline justify-between border-t border-gray-200/70 pt-2 text-xs">
                  <span className="text-gray-500">
                    Ocupación: <strong>{esc.ocupacionPct}%</strong> ({esc.desperdicio} vacíos)
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    S/. {Number(esc.costoEstimado || 0).toFixed(2)}
                  </span>
                </div>
                <p
                  className={`text-[11px] font-semibold ${
                    esc.recomendado ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {esc.impacto}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de mejores trabajadores en campañas anteriores */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">
              Mejores Trabajadores de Campañas Anteriores (Ranking HPW)
            </h2>
            <p className="text-xs text-gray-500">
              Ordenados por puntaje HPW; quienes residen en zonas lejanas se priorizan para recojo y hospedaje en campamentos de Olmos
            </p>
          </div>
          <span className="text-xs font-medium text-gray-400">
            {mejoresTrabajadores.length} trabajadores evaluados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                <th className="py-2.5 pr-3">#</th>
                <th className="py-2.5 pr-3">Trabajador</th>
                <th className="py-2.5 pr-3">Distrito / Paradero</th>
                <th className="py-2.5 pr-3">Campaña Anterior</th>
                <th className="py-2.5 pr-3">Puntaje HPW</th>
                <th className="py-2.5 pr-3">Asistencia</th>
                <th className="py-2.5 pr-3">Alojamiento / Traslado</th>
                <th className="py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {mejoresTrabajadores.map((w, idx) => {
                const wspUrl = buildWhatsAppUrl(
                  w.telefono,
                  w,
                  selectedConv?.titulo
                )
                return (
                  <tr key={w.id_trabajador} className="hover:bg-gray-50/70">
                    <td className="py-3 pr-3 font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-gray-900">
                        {w.nombres} {w.apellidos}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        DNI: {w.numero_documento}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-800">{w.distrito}</p>
                      <p className="text-[11px] text-gray-400">
                        {w.paradero_preferido || 'Paradero central'}
                      </p>
                    </td>
                    <td className="py-3 pr-3">{w.campana_anterior}</td>
                    <td className="py-3 pr-3 font-bold text-[#147a3f]">
                      {w.puntaje_hpw.toFixed(1)}
                    </td>
                    <td className="py-3 pr-3">{w.porcentaje_asistencia.toFixed(0)}%</td>
                    <td className="py-3 pr-3">
                      {w.requiere_campamento_olmos ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          Campamento Olmos (Zona lejana)
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Traslado local
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openWorkerDetail(w)}
                          title="Ver detalle de rendimiento"
                          aria-label={`Ver detalle de ${w.nombres}`}
                          className="rounded-lg p-1.5 text-[#0284c7] hover:bg-sky-50 cursor-pointer"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>

                        {wspUrl ? (
                          <a
                            href={wspUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Contactar por WhatsApp (${w.telefono})`}
                            aria-label={`WhatsApp de ${w.nombres}`}
                            className="rounded-lg p-1.5 text-[#147a3f] hover:bg-emerald-50"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                              <line x1="12" x2="12.01" y1="18" y2="18" />
                            </svg>
                          </a>
                        ) : (
                          <span
                            title="Sin teléfono registrado"
                            className="rounded-lg p-1.5 text-gray-300 cursor-not-allowed"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                              <line x1="12" x2="12.01" y1="18" y2="18" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailWorker && (
        <WorkerPerformanceModal
          worker={detailWorker}
          detailData={detailData}
          loading={loadingDetail}
          onClose={() => setDetailWorker(null)}
        />
      )}
    </div>
  )
}
