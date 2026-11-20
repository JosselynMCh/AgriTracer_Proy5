import { useMemo, useState } from 'react'
import GoogleMapView from '../common/GoogleMapView'

const ROUTE_COLORS = ['#15803d', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444']

export default function RouteCoverageMap({ mapa }) {
  const [region, setRegion] = useState('Lambayeque - Piura')

  const { polylines, markers } = useMemo(() => {
    const paraderos = mapa?.paraderos || []
    const buses = mapa?.buses || []

    const byRoute = new Map()
    paraderos.forEach((p) => {
      if (!byRoute.has(p.id_ruta)) byRoute.set(p.id_ruta, [])
      byRoute.get(p.id_ruta).push({ lat: p.latitud, lng: p.longitud })
    })

    const lines = Array.from(byRoute.entries()).map(([, path], idx) => ({
      path,
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      weight: idx === 0 ? 4.5 : 3.5,
    }))

    const busMarkers = buses
      .filter((b) => typeof b.latitud === 'number' && typeof b.longitud === 'number')
      .map((b) => ({
        lat: b.latitud,
        lng: b.longitud,
        title: `${b.codigo_bus} (${b.placa})`,
        color: '#0b3d2c',
        scale: 8,
        info: `<strong>${b.codigo_bus}</strong><br/>Placa: ${b.placa}<br/>Estado: ${b.estado_bus}<br/>Velocidad: ${b.velocidad_kmh} km/h`,
      }))

    const stopMarkers = paraderos.map((p) => ({
      lat: p.latitud,
      lng: p.longitud,
      title: p.nombre_paradero,
      color: '#f97316',
      scale: 6,
      info: `<strong>${p.nombre_paradero}</strong><br/>${p.ruta_nombre || ''}`,
    }))

    return {
      polylines: lines,
      markers: [...stopMarkers, ...busMarkers],
    }
  }, [mapa])

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs flex flex-col h-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-gray-900">
          Mapa de Rutas y Cobertura
        </h2>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Seleccionar región"
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 outline-none focus:border-[#15803d]"
        >
          <option value="Lambayeque - Piura">Lambayeque - Piura</option>
          <option value="Lambayeque">Lambayeque</option>
          <option value="Piura">Piura</option>
        </select>
      </div>

      <div className="relative flex-1 min-h-[260px] overflow-hidden rounded-xl border border-gray-100">
        <GoogleMapView
          center={
            region === 'Piura'
              ? { lat: -5.2, lng: -80.63 }
              : { lat: -6.25, lng: -79.85 }
          }
          zoom={region === 'Lambayeque - Piura' ? 8 : 10}
          polylines={polylines}
          markers={markers}
          className="h-full w-full min-h-[260px]"
        />

        {/* Leyenda flotante */}
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/95 p-2.5 shadow-sm backdrop-blur-xs text-[11px] space-y-1.5 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#15803d]" />
            <span>Ruta Óptima</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
            <span>Ruta Alterna</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0b3d2c]" />
            <span>Bus en Tránsito</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span>Paradero / Punto</span>
          </div>
        </div>
      </div>
    </div>
  )
}
