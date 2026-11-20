const STATUS_LABELS = {
  PROGRAMADA: { label: 'Programada', cls: 'bg-emerald-100 text-emerald-700' },
  ENVIADA: { label: 'Enviada', cls: 'bg-teal-100 text-teal-700' },
  EN_PROCESO: { label: 'En Proceso', cls: 'bg-sky-100 text-sky-700' },
  CERRADA: { label: 'Completada', cls: 'bg-green-100 text-green-700' },
  BORRADOR: { label: 'Borrador', cls: 'bg-gray-100 text-gray-700' },
  CANCELADA: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
}

const TURNO_LABELS = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
  COMPLETO: 'Completo',
}

export default function RecentCallsTable({ rows = [], onViewAll }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs flex flex-col h-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">
          Convocatorias Recientes
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
        >
          Ver todas →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 font-semibold">
              <th className="py-2.5 pr-3">Fecha</th>
              <th className="py-2.5 pr-3">Zona</th>
              <th className="py-2.5 pr-3">Turno</th>
              <th className="py-2.5 pr-3">HPW Convocados</th>
              <th className="py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {rows.map((row) => {
              const badge = STATUS_LABELS[row.estado] || {
                label: row.estado,
                cls: 'bg-gray-100 text-gray-700',
              }
              return (
                <tr key={row.id_convocatoria} className="hover:bg-gray-50/70">
                  <td className="py-3 pr-3 whitespace-nowrap">{row.fecha}</td>
                  <td className="py-3 pr-3 font-medium text-gray-900">
                    {row.zona}
                  </td>
                  <td className="py-3 pr-3">
                    {TURNO_LABELS[row.turno] || row.turno}
                  </td>
                  <td className="py-3 pr-3 font-medium">
                    {row.hpw_convocados}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-gray-500">
                  No hay convocatorias registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
