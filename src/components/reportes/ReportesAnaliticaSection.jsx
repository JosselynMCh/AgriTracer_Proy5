import { useEffect, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import LoadingOverlay from '../common/LoadingOverlay'

const PERIOD_OPTIONS = [
  { key: '30d', label: 'Últimos 30 días' },
  { key: '3m', label: 'Últimos 3 meses' },
  { key: '1y', label: 'Último año' },
]

const PIE_COLORS = ['#2563eb', '#f59e0b', '#ef4444', '#16a34a', '#8b5cf6']

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
  const [loadedPeriod, setLoadedPeriod] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/reportes?period=${period}`)
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setLoadedPeriod(period)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadedPeriod(period)
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [period])

  const loading = loadedPeriod !== period && !error

  const kpis = data?.kpis || {}
  const series =
    data?.reingresoSerie?.length > 0
      ? data.reingresoSerie
      : [{ label: 'Sin datos', value: 0 }]
  const pieSlices = createPieSlices(data?.distribucionZonas || [], 80, 80, 70)

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

  const handleExportCsv = () => {
    const rows = [
      ['Indicador', 'Valor'],
      ['Costo Promedio por Persona', `S/. ${Number(kpis.costoPromedio || 0).toFixed(2)}`],
      ['Reingreso HPW', `${Number(kpis.reingresoHpw || 0).toFixed(1)}%`],
      ['Puntualidad de Buses', `${Number(kpis.puntualidadBuses || 0).toFixed(1)}%`],
      ['Trabajadores Activos', kpis.trabajadoresActivos ?? 0],
    ]
    const csvContent = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'reporte_agri_tracer.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={loading} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((option) => {
            const active = period === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setPeriod(option.key)}
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
            <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg z-20 text-xs">
              <button
                type="button"
                onClick={handleExportCsv}
                className="block w-full px-4 py-2 text-left font-medium text-gray-700 hover:bg-emerald-50 hover:text-[#147a3f] cursor-pointer"
              >
                Exportar Excel (.csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  window.print()
                }}
                className="block w-full px-4 py-2 text-left font-medium text-gray-700 hover:bg-emerald-50 hover:text-[#147a3f] cursor-pointer"
              >
                Imprimir / PDF
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
    </div>
  )
}
