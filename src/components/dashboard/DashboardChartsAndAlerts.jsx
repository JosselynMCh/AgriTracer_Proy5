function AlertIcon({ estado }) {
  if (estado === 'ERROR' || estado === 'PENDIENTE') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2 1 21h22L12 2Zm1 14h-2v-2h2v2Zm0-4h-2V8h2v4Z" />
        </svg>
      </span>
    )
  }
  if (estado === 'ENVIADA') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-6h2Zm0-8h-2V7h2Z" />
        </svg>
      </span>
    )
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
}

export default function DashboardChartsAndAlerts({
  reingresoSerie = [],
  costosSerie = [],
  alertas = [],
}) {
  const width = 280
  const height = 110
  const padX = 22
  const padY = 14
  const minVal = 0
  const maxVal = 100

  const safeReingreso =
    reingresoSerie.length > 0 ? reingresoSerie : [{ label: 'Sin datos', value: 0 }]

  const coords = safeReingreso.map((p, idx) => {
    const denom = Math.max(1, safeReingreso.length - 1)
    const x =
      safeReingreso.length === 1
        ? width / 2
        : padX + (idx * (width - padX * 2)) / denom
    const y =
      height -
      padY -
      ((p.value - minVal) / (maxVal - minVal)) * (height - padY * 2)
    return { ...p, x, y }
  })

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ')

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${
          height - padY
        } L ${coords[0].x} ${height - padY} Z`
      : ''

  const lastCoord = coords[coords.length - 1]
  const safeCostos =
    costosSerie.length > 0 ? costosSerie : [{ label: 'Sin datos', value: 0 }]
  const maxCosto = Math.max(30, ...safeCostos.map((c) => c.value || 0))

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. Evolución del Reingreso HPW */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-[15px] font-bold text-gray-900">
          Evolución del Reingreso HPW
        </h2>

        <div className="flex items-stretch gap-2">
          <div className="flex flex-col justify-between py-2 text-[10px] font-medium text-gray-400">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>

          <div className="flex-1">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
              {[0.15, 0.5, 0.85].map((ratio, i) => (
                <line
                  key={i}
                  x1={padX}
                  x2={width - padX}
                  y1={height * ratio}
                  y2={height * ratio}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}

              {areaPath && <path d={areaPath} fill="#16a34a" fillOpacity="0.12" />}
              {coords.length > 1 && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#15803d"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {coords.map((c, idx) => (
                <circle
                  key={`${c.label}-${idx}`}
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  fill="#15803d"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              ))}

              {lastCoord && (
                <g transform={`translate(${Math.min(width - 52, Math.max(4, lastCoord.x - 24))}, ${Math.max(0, lastCoord.y - 28)})`}>
                  <rect width="48" height="20" rx="5" fill="#0b3d2c" />
                  <text
                    x="24"
                    y="13.5"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#fff"
                  >
                    {Number(lastCoord.value).toFixed(1)}%
                  </text>
                </g>
              )}
            </svg>

            <div className="mt-1 flex justify-between px-3 text-[11px] font-medium text-gray-500">
              {safeReingreso.map((p, idx) => (
                <span key={`${p.label}-${idx}`}>{p.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Costo de Transporte */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-[15px] font-bold text-gray-900">
          Costo de Transporte
        </h2>

        <div className="flex items-stretch gap-2">
          <div className="flex flex-col justify-between py-2 text-[10px] font-medium text-gray-400">
            <span>{Math.ceil(maxCosto)}</span>
            <span>{Math.round(maxCosto / 2)}</span>
            <span>0</span>
          </div>

          <div className="flex-1">
            <div className="relative flex h-28 items-end justify-around border-b border-gray-100 px-2 pt-7">
              {safeCostos.map((bar, index) => {
                const heightPct = Math.round(((bar.value || 0) / maxCosto) * 100)
                const isLast = index === safeCostos.length - 1
                return (
                  <div
                    key={`${bar.label}-${index}`}
                    className="relative flex h-full w-10 flex-col items-center justify-end"
                  >
                    {isLast && (
                      <span className="mb-1.5 whitespace-nowrap rounded-md bg-[#0b3d2c] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        S/. {Number(bar.value || 0).toFixed(2)}
                      </span>
                    )}
                    <div
                      className="w-8 rounded-t-md bg-[#198754] transition-all"
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-2 flex justify-around px-2 text-[11px] font-medium text-gray-500">
              {safeCostos.map((bar, idx) => (
                <span key={`${bar.label}-${idx}`}>{bar.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Alertas y Notificaciones */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs flex flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-gray-900">
            Alertas y Notificaciones
          </h2>
          <span className="text-[11px] font-semibold text-gray-400">
            BD Neon
          </span>
        </div>

        <ul className="divide-y divide-gray-100 flex-1 flex flex-col justify-center">
          {alertas.map((alert) => (
            <li
              key={alert.id_notificacion}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertIcon estado={alert.estado_notificacion} />
                <span
                  title={alert.message}
                  className="truncate text-xs font-medium text-gray-700"
                >
                  {alert.titulo}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-gray-400">
                {formatShortDate(alert.fecha_creacion)}
              </span>
            </li>
          ))}

          {alertas.length === 0 && (
            <li className="py-4 text-center text-xs text-gray-400">
              Sin alertas registradas.
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
