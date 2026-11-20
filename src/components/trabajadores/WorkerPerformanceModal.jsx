export default function WorkerPerformanceModal({
  worker,
  detailData,
  loading,
  onClose,
}) {
  if (!worker) return null

  const rendimientos = detailData?.rendimientos || []
  const convocatorias = detailData?.convocatorias || []

  const avg = (key) => {
    const valid = rendimientos.filter((r) => typeof r[key] === 'number')
    if (valid.length === 0) return null
    return valid.reduce((sum, r) => sum + r[key], 0) / valid.length
  }

  const avgHpw = avg('puntaje_hpw')
  const avgProd = avg('puntaje_productividad')
  const avgAsis = avg('porcentaje_asistencia')
  const avgCal = avg('puntaje_calidad')
  const totalDias = rendimientos.reduce(
    (sum, r) => sum + Number(r.dias_trabajados || 0),
    0
  )

  // Factores que explican el rendimiento desde la BD
  const factoresPositivos = []
  if (avgAsis !== null && avgAsis >= 90) {
    factoresPositivos.push(`Alta puntualidad y asistencia (${avgAsis.toFixed(1)}%)`)
  }
  if (avgProd !== null && avgProd >= 80) {
    factoresPositivos.push(`Productividad sobresaliente (${avgProd.toFixed(1)} pts)`)
  }
  if (avgCal !== null && avgCal >= 80) {
    factoresPositivos.push(`Calidad de cosecha consistente (${avgCal.toFixed(1)} pts)`)
  }
  if (totalDias > 0) {
    factoresPositivos.push(`${totalDias} días acumulados en campañas evaluadas`)
  }

  const notasBd = rendimientos
    .map((r) => (r.notas_fuente ? `${r.campana}: ${r.notas_fuente}` : null))
    .filter(Boolean)

  const motivosSeleccion = convocatorias
    .map((c) => (c.motivo_seleccion ? `${c.titulo}: ${c.motivo_seleccion}` : null))
    .filter(Boolean)

  // Coordenadas para gráfica SVG (0 - 100)
  const width = 420
  const height = 140
  const padX = 24
  const padY = 16
  const chartSeries =
    rendimientos.length > 0
      ? rendimientos.map((r) => ({
          label: r.campana || r.periodo_nombre,
          value: Number(r.puntaje_hpw ?? r.puntaje_productividad ?? 0),
        }))
      : []

  const points = chartSeries.map((item, idx) => {
    const denom = Math.max(1, chartSeries.length - 1)
    const x =
      chartSeries.length === 1
        ? width / 2
        : padX + (idx * (width - padX * 2)) / denom
    const y =
      height - padY - (Math.min(100, Math.max(0, item.value)) / 100) * (height - padY * 2)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-[#0b3d2c]">
              {`${worker.nombres?.[0] || ''}${worker.apellidos?.[0] || ''}`.toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {worker.nombres} {worker.apellidos}
              </h3>
              <p className="text-xs text-gray-500">
                {worker.tipo_documento}: {worker.numero_documento} &bull;{' '}
                {worker.distrito} ({worker.zona}) &bull; Tel:{' '}
                {worker.telefono || 'No registrado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Cargando historial de rendimiento desde Neon...
          </div>
        ) : (
          <>
            {/* Resumen de métricas promedio */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200/80 bg-emerald-50/50 p-3">
                <p className="text-[11px] font-medium text-gray-500">Puntaje HPW</p>
                <p className="mt-0.5 text-xl font-bold text-[#0b3d2c]">
                  {avgHpw !== null ? avgHpw.toFixed(1) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/80 bg-white p-3">
                <p className="text-[11px] font-medium text-gray-500">Productividad</p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">
                  {avgProd !== null ? `${avgProd.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/80 bg-white p-3">
                <p className="text-[11px] font-medium text-gray-500">Asistencia</p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">
                  {avgAsis !== null ? `${avgAsis.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/80 bg-white p-3">
                <p className="text-[11px] font-medium text-gray-500">Calidad</p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">
                  {avgCal !== null ? `${avgCal.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>

            {/* Gráfica + Factores del rendimiento */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Gráfica de rendimiento */}
              <div className="md:col-span-7 rounded-xl border border-gray-200/80 bg-white p-4 flex flex-col justify-between">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    {rendimientos.length === 1
                      ? `Desglose de Rendimiento (${rendimientos[0].campana})`
                      : 'Gráfica de Rendimiento por Campaña (HPW)'}
                  </h4>
                  {rendimientos.length === 1 && (
                    <span className="text-[11px] font-medium text-gray-400">
                      {rendimientos[0].periodo_nombre}
                    </span>
                  )}
                </div>

                {rendimientos.length === 1 ? (
                  <div className="flex items-stretch gap-2 pt-2">
                    <div className="flex flex-col justify-between pb-6 text-[10px] text-gray-400">
                      <span>100</span>
                      <span>50</span>
                      <span>0</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex h-36 items-end justify-around border-b border-gray-100 px-2 pt-5">
                        {[
                          {
                            label: 'Productividad',
                            value: Number(rendimientos[0].puntaje_productividad ?? 0),
                            color: 'bg-emerald-500',
                          },
                          {
                            label: 'Asistencia',
                            value: Number(rendimientos[0].porcentaje_asistencia ?? 0),
                            color: 'bg-sky-500',
                          },
                          {
                            label: 'Calidad',
                            value: Number(rendimientos[0].puntaje_calidad ?? 0),
                            color: 'bg-teal-500',
                          },
                          {
                            label: 'Puntaje HPW',
                            value: Number(rendimientos[0].puntaje_hpw ?? 0),
                            color: 'bg-[#0b3d2c]',
                          },
                        ].map((bar) => (
                          <div
                            key={bar.label}
                            className="flex h-full w-14 flex-col items-center justify-end"
                          >
                            <span className="mb-1 text-[11px] font-bold text-gray-800">
                              {bar.value.toFixed(1)}
                            </span>
                            <div
                              className={`w-9 rounded-t-md ${bar.color} transition-all`}
                              style={{
                                height: `${Math.max(6, Math.min(100, bar.value))}%`,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-around px-2 text-[10px] font-semibold text-gray-600">
                        <span>Productividad</span>
                        <span>Asistencia</span>
                        <span>Calidad</span>
                        <span>HPW</span>
                      </div>
                    </div>
                  </div>
                ) : points.length > 1 ? (
                  <div className="flex items-stretch gap-2">
                    <div className="flex flex-col justify-between py-2 text-[10px] text-gray-400">
                      <span>100</span>
                      <span>50</span>
                      <span>0</span>
                    </div>
                    <div className="flex-1">
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-36 w-full overflow-visible"
                      >
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
                        {areaPath && (
                          <path d={areaPath} fill="#16a34a" fillOpacity="0.14" />
                        )}
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#147a3f"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, idx) => (
                          <g key={`${p.label}-${idx}`}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4.5"
                              fill="#147a3f"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                            <text
                              x={p.x}
                              y={Math.max(10, p.y - 10)}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="700"
                              fill="#0b3d2c"
                            >
                              {p.value.toFixed(1)}
                            </text>
                          </g>
                        ))}
                      </svg>
                      <div className="mt-1 flex justify-between px-2 text-[10px] font-medium text-gray-500">
                        {chartSeries.map((c, idx) => (
                          <span key={`${c.label}-${idx}`} className="truncate max-w-[90px]">
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-10 text-center text-xs text-gray-400">
                    Sin evaluaciones registradas en rendimiento_trabajadores.
                  </p>
                )}
              </div>

              {/* Qué lo llevó a tener ese rendimiento */}
              <div className="md:col-span-5 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-[#0b3d2c]">
                  ¿Qué lo llevó a este rendimiento?
                </h4>

                {factoresPositivos.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {factoresPositivos.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 text-emerald-600 font-bold">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {notasBd.length > 0 && (
                  <div className="border-t border-emerald-100 pt-2 space-y-1">
                    <p className="text-[11px] font-semibold text-gray-600">
                      Notas de evaluación:
                    </p>
                    {notasBd.map((n, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        &bull; {n}
                      </p>
                    ))}
                  </div>
                )}

                {motivosSeleccion.length > 0 && (
                  <div className="border-t border-emerald-100 pt-2 space-y-1">
                    <p className="text-[11px] font-semibold text-gray-600">
                      Motivo de selección en convocatorias:
                    </p>
                    {motivosSeleccion.map((m, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        &bull; {m}
                      </p>
                    ))}
                  </div>
                )}

                {factoresPositivos.length === 0 &&
                  notasBd.length === 0 &&
                  motivosSeleccion.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Aún no hay observaciones registradas para este trabajador.
                    </p>
                  )}
              </div>
            </div>

            {/* Tabla de campañas y convocatorias */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">
                Rendimiento en Campañas Asociadas ({rendimientos.length})
              </h4>

              <div className="overflow-x-auto rounded-xl border border-gray-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Campaña</th>
                      <th className="px-3 py-2">Periodo</th>
                      <th className="px-3 py-2">Días</th>
                      <th className="px-3 py-2">Prod.</th>
                      <th className="px-3 py-2">Asist.</th>
                      <th className="px-3 py-2">Calidad</th>
                      <th className="px-3 py-2">HPW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {rendimientos.map((r) => (
                      <tr key={r.performance_id}>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {r.campana}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {r.periodo_nombre}
                        </td>
                        <td className="px-3 py-2">{r.dias_trabajados}</td>
                        <td className="px-3 py-2">{r.puntaje_productividad ?? '—'}</td>
                        <td className="px-3 py-2">
                          {r.porcentaje_asistencia !== null
                            ? `${r.porcentaje_asistencia}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2">{r.puntaje_calidad ?? '—'}</td>
                        <td className="px-3 py-2 font-bold text-[#0b3d2c]">
                          {r.puntaje_hpw ?? '—'}
                        </td>
                      </tr>
                    ))}
                    {rendimientos.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                          Sin registros de rendimiento en campañas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {convocatorias.length > 0 && (
                <div className="pt-1">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                    Convocatorias Participadas ({convocatorias.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {convocatorias.map((c) => (
                      <div
                        key={c.id_candidato}
                        className="rounded-lg border border-gray-200/80 bg-gray-50/60 px-3 py-2 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{c.titulo}</p>
                          <p className="text-[11px] text-gray-500">
                            {c.campana} &bull; {c.fecha}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {c.estado_asistencia}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0b3d2c] px-5 py-2 text-xs font-semibold text-white hover:bg-[#093221] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
