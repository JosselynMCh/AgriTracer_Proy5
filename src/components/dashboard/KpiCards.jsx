function KpiIcon({ name }) {
  const cls = 'h-6 w-6 text-[#0b4f34]'
  switch (name) {
    case 'users':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
        </svg>
      )
    case 'bus':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z" />
        </svg>
      )
    case 'pin':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
        </svg>
      )
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm-6 8v-1c0-2.67 5.33-4 6-4s6 1.33 6 4v1H6Zm12.5-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm1.5 1.5c1.5 0 4 .75 4 2.25V17h-3.5v-1c0-1.4-.65-2.65-1.65-3.55.38-.29.77-.45 1.15-.45Z" />
        </svg>
      )
  }
}

export default function KpiCards({ kpis }) {
  const reingreso = kpis?.reingresoHpw ?? 0
  const costo = kpis?.costoPromedio ?? 0
  const cubiertos = kpis?.distritosCubiertos ?? 0
  const totales = kpis?.distritosTotales ?? 0
  const convocados = kpis?.trabajadoresConvocados ?? 0

  const cards = [
    {
      id: 'reingreso',
      title: 'Reingreso HPW',
      subtitle: '( Semanas Pico )',
      value: `${reingreso.toFixed(1)}%`,
      progress: Math.min(100, Math.max(10, Math.round(reingreso))),
      icon: 'users',
    },
    {
      id: 'costo',
      title: 'Costo Promedio de',
      subtitle: 'Transporte por Persona',
      value: `S/. ${costo.toFixed(2)}`,
      progress: 78,
      icon: 'bus',
    },
    {
      id: 'distritos',
      title: 'Distritos Cubiertos',
      subtitle: '',
      value: `${cubiertos} / ${totales}`,
      check: cubiertos > 0,
      progress: totales > 0 ? Math.min(100, Math.round((cubiertos / totales) * 100)) : 0,
      icon: 'pin',
    },
    {
      id: 'trabajadores',
      title: 'Trabajadores Convocados',
      subtitle: '',
      value: convocados.toLocaleString('es-PE'),
      progress: 85,
      icon: 'worker',
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100/80">
              <KpiIcon name={item.icon} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 leading-snug">
                {item.title}
                {item.subtitle && (
                  <span className="block text-gray-500">{item.subtitle}</span>
                )}
              </p>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-gray-900">
                  {item.value}
                </span>

                {item.check && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#198754] transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      ))}
    </section>
  )
}
