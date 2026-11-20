import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import { exportReportesToPdf } from '../../utils/exportReportesPdf'
import LoadingOverlay from '../common/LoadingOverlay'

const PERIOD_OPTIONS = [
  { key: '30d', label: 'Últimos 30 días' },
  { key: '3m', label: 'Últimos 3 meses' },
  { key: '1y', label: 'Último año' },
]

const PIE_COLORS = ['#2563eb', '#f59e0b', '#ef4444', '#16a34a', '#8b5cf6']
const COST_BAR_COLORS = {
  FLETE: 'bg-[#147a3f]',
  COMBUSTIBLE: 'bg-amber-500',
  PEAJE: 'bg-sky-500',
  OTRO: 'bg-violet-500',
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function createPieSlices(items, cx, cy, r) {
  let currentAngle = 0
  return items.map((item, idx) => {
    const startAngle = currentAngle
    const sliceAngle = (item.percent / 100) * 360
    const endAngle = startAngle + sliceAngle
    currentAngle = endAngle

    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArc = sliceAngle > 180 ? 1 : 0

    const d =
      sliceAngle >= 359.9
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : [
            `M ${cx} ${cy}`,
            `L ${start.x} ${start.y}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
            'Z',
          ].join(' ')

    return { ...item, d, color: PIE_COLORS[idx % PIE_COLORS.length] }
  })
}

export default function ReportesAnaliticaSection() {
  const [period, setPeriod] = useState('30d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [loadedKey, setLoadedKey] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  const queryKey = `${period}|${fromDate}|${toDate}|${zoneId}`

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ period })
    if (fromDate && toDate) {
      params.set('from', fromDate)
      params.set('to', toDate)
    }
    if (zoneId) params.set('id_zona', zoneId)

    apiFetch(`/api/reportes?${params.toString()}`)
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
  }, [period, fromDate, toDate, zoneId, queryKey])

  const loading = loadedKey !== queryKey && !error

  const kpis = data?.kpis || {}
  const series =
    data?.reingresoSerie?.length > 0
      ? data.reingresoSerie
      : [{ label: 'Sin datos', value: 0 }]
  const pieSlices = createPieSlices(data?.distribucionZonas || [], 80, 80, 70)
  const costosPorTipo = data?.costosPorTipo || []
  const resumenPorZona = data?.resumenPorZona || []
  const topTrabajadores = data?.topTrabajadores || []
  const zonas = data?.zonas || []

  const width = 460
  const height = 165
  const padX = 24
  const padY = 18
  const minVal = 0
  const maxVal = 100

  const points = series.map((item, idx) => {
    const denom = Math.max(1, series.length - 1)
    const x =
      series.length === 1
        ? width / 2
        : padX + (idx * (width - padX * 2)) / denom
    const y =
      height -
      padY -
      ((item.value - minVal) / (maxVal - minVal)) * (height - padY * 2)
    return { ...item, x, y }
  })

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${
          height - padY
        } L ${points[0].x} ${height - padY} Z`
      : ''

  const lastPoint = points[points.length - 1]

  const periodLabel =
    fromDate && toDate
      ? `${fromDate} a ${toDate}`
      : PERIOD_OPTIONS.find((p) => p.key === period)?.label || period
  const zonaLabel =
    zonas.find((z) => String(z.id_zona) === zoneId)?.nombre || 'Todas las zonas'

  const handleExportCsv = () => {
    const rows = [
      ['REPORTE ANALITICO AGRI-TRACER', periodLabel, zonaLabel],
      [],
      ['Indicador', 'Valor'],
      ['Costo Promedio por Persona', `S/. ${Number(kpis.costoPromedio || 0).toFixed(2)}`],
      ['Reingreso HPW', `${Number(kpis.reingresoHpw || 0).toFixed(1)}%`],
      ['Puntualidad de Buses', `${Number(kpis.puntualidadBuses || 0).toFixed(1)}%`],
      ['Trabajadores Activos', kpis.trabajadoresActivos ?? 0],
      [],
      ['RESUMEN POR ZONA', 'Convocatorias', 'Requeridos', 'Viajes', 'Costo Total'],
      ...resumenPorZona.map((z) => [
        z.zona,
        z.convocatorias,
        z.requeridos,
        z.viajes,
        `S/. ${Number(z.costo_total || 0).toFixed(2)}`,
      ]),
    ]
    const csvContent = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'reporte_analitica_agri_tracer.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  const handleExportPdf = () => {
    setExportOpen(false)
    exportReportesToPdf({
      periodLabel,
      zonaLabel,
      kpis,
      costosPorTipo,
      resumenPorZona,
      topTrabajadores,
    })
  }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading} />

      {/* Barra de filtros y exportación */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((option) => {
            const active = period === option.key && !(fromDate && toDate)
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                  setPeriod(option.key)
                }}
                className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-[#147a3f] text-white shadow-xs'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            )
          })}

          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="Fecha desde"
              className="outline-none text-gray-700"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="Fecha hasta"
              className="outline-none text-gray-700"
            />
          </div>

          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            aria-label="Filtrar por zona"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 outline-none focus:border-[#147a3f]"
          >
            <option value="">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z.id_zona} value={z.id_zona}>
                {z.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#147a3f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] cursor-pointer"
          >
            <span>Exportar Reporte</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg z-20 text-xs">
              <button
                type="button"
                onClick={handleExportPdf}
                className="block w-full px-4 py-2 text-left font-medium text-gray-700 hover:bg-emerald-50 hover:text-[#147a3f] cursor-pointer"
              >
                Descargar Reporte (.pdf)
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="block w-full px-4 py-2 text-left font-medium text-gray-700 hover:bg-emerald-50 hover:text-[#147a3f] cursor-pointer"
              >
                Exportar Excel (.csv)
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C7.58 2 4 3.79 4 6v12c0 2.21 3.58 4 8 4s8-1.79 8-4V6c0-2.21-3.58-4-8-4Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Costo Promedio por Persona</p>
            <span className="mt-0.5 block text-xl font-bold text-gray-900">
              S/. {Number(kpis.costoPromedio || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803d]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Reingreso HPW</p>
            <span className="mt-0.5 block text-xl font-bold text-gray-900">
              {Number(kpis.reingresoHpw || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803d]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Puntualidad de Buses</p>
            <span className="mt-0.5 block text-xl font-bold text-gray-900">
              {Number(kpis.puntualidadBuses || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803d]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm-6 8v-1c0-2.67 5.33-4 6-4s6 1.33 6 4v1H6Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Trabajadores Activos</p>
            <span className="mt-0.5 block text-xl font-bold text-gray-900">
              {Number(kpis.trabajadoresActivos || 0).toLocaleString('es-PE')}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-[15px] font-bold text-gray-900">
            Evolución del Reingreso HPW
          </h2>

          <div className="flex items-stretch gap-3">
            <div className="flex flex-col justify-between py-2 text-[11px] font-medium text-gray-400">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            <div className="flex-1">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
                {[0.15, 0.5, 0.85].map((ratio, idx) => (
                  <line
                    key={idx}
                    x1={padX}
                    x2={width - padX}
                    y1={height * ratio}
                    y2={height * ratio}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                ))}

                {areaPath && <path d={areaPath} fill="#16a34a" fillOpacity="0.12" />}
                {points.length > 1 && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#15803d"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {points.map((p, idx) => (
                  <circle
                    key={`${p.label}-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill="#15803d"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                ))}

                {lastPoint && (
                  <g transform={`translate(${Math.min(width - 60, Math.max(4, lastPoint.x - 28))}, ${Math.max(0, lastPoint.y - 34)})`}>
                    <rect width="56" height="24" rx="6" fill="#0b3d2c" />
                    <text x="28" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                      {Number(lastPoint.value).toFixed(1)}%
                    </text>
                  </g>
                )}
              </svg>

              <div className="mt-1 flex justify-between px-4 text-xs font-medium text-gray-500">
                {series.map((s, idx) => (
                  <span key={`${s.label}-${idx}`}>{s.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <h2 className="mb-4 text-[15px] font-bold text-gray-900">
            Distribución por Zona
          </h2>

          <div className="flex flex-1 flex-wrap items-center justify-center gap-6 py-2">
            <svg viewBox="0 0 160 160" className="h-44 w-44 shrink-0">
              {pieSlices.map((slice) => (
                <path key={slice.name} d={slice.d} fill={slice.color} />
              ))}
            </svg>

            <ul className="space-y-3 text-xs sm:text-sm min-w-[140px]">
              {pieSlices.map((zone) => (
                <li key={zone.name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                    <span>{zone.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{zone.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Analítica complementaria: Costos por Tipo + Resumen por Zona */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-[15px] font-bold text-gray-900">
            Desglose de Costos de Transporte
          </h2>

          <div className="space-y-3">
            {costosPorTipo.map((c) => (
              <div key={c.tipo} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">{c.tipo}</span>
                  <span className="font-bold text-gray-900">
                    S/. {Number(c.total || 0).toFixed(2)} ({c.percent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      COST_BAR_COLORS[c.tipo] || 'bg-[#147a3f]'
                    }`}
                    style={{ width: `${Math.max(4, c.percent)}%` }}
                  />
                </div>
              </div>
            ))}
            {costosPorTipo.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">
                Sin costos registrados en costos_transporte.
              </p>
            )}
          </div>
        </div>

        <div className="xl:col-span-7 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-[15px] font-bold text-gray-900">
            Resumen Analítico por Zona
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-2 pr-3">Zona</th>
                  <th className="py-2 pr-3">Convocatorias</th>
                  <th className="py-2 pr-3">Requeridos</th>
                  <th className="py-2 pr-3">Viajes</th>
                  <th className="py-2 text-right">Costo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {resumenPorZona.map((z) => (
                  <tr key={z.id_zona} className="hover:bg-gray-50/70">
                    <td className="py-2.5 pr-3 font-semibold text-gray-900">{z.zona}</td>
                    <td className="py-2.5 pr-3">{z.convocatorias}</td>
                    <td className="py-2.5 pr-3">{z.requeridos}</td>
                    <td className="py-2.5 pr-3">{z.viajes}</td>
                    <td className="py-2.5 text-right font-bold text-[#147a3f]">
                      S/. {Number(z.costo_total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Trabajadores Evaluados */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">
            Top Trabajadores Evaluados (HPW)
          </h2>
          <span className="text-xs text-gray-400">
            {topTrabajadores.length} destacados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                <th className="py-2 pr-3">DNI</th>
                <th className="py-2 pr-3">Trabajador</th>
                <th className="py-2 pr-3">Distrito</th>
                <th className="py-2 pr-3">Asistencia</th>
                <th className="py-2 pr-3">Clasificación</th>
                <th className="py-2 text-right">Puntaje HPW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {topTrabajadores.map((w) => (
                <tr key={w.id_trabajador} className="hover:bg-gray-50/70">
                  <td className="py-2.5 pr-3 font-medium">{w.numero_documento}</td>
                  <td className="py-2.5 pr-3 font-semibold text-gray-900">
                    {w.nombres} {w.apellidos}
                  </td>
                  <td className="py-2.5 pr-3">{w.distrito}</td>
                  <td className="py-2.5 pr-3">
                    {Number(w.porcentaje_asistencia || 0).toFixed(0)}%
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                      {w.clasificacion_hpw}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-[#147a3f]">
                    {Number(w.puntaje_hpw || 0).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
