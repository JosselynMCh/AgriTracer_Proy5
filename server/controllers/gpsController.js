import pool from '../db.js'

export async function getGpsTracking(_req, res) {
  try {
    const [busesRes, viajesStatsRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT ON (b.bus_id)
          b.bus_id,
          COALESCE(b.codigo_interno, 'BUS-' || b.bus_id) AS codigo_bus,
          b.numero_placa AS placa,
          b.estado_bus,
          b.capacidad,
          b.proveedor_gps,
          p.latitud,
          p.longitud,
          COALESCE(p.velocidad_kmh, 0)::float AS velocidad_kmh,
          p.fecha_registro,
          TO_CHAR(p.fecha_registro, 'HH24:MI') AS hora_actualizacion,
          r.nombre AS ruta_nombre,
          r.descripcion_origen,
          r.descripcion_destino
        FROM buses b
        LEFT JOIN posiciones_gps p ON p.bus_id = b.bus_id
        LEFT JOIN viajes_transporte vt ON vt.id_viaje = p.id_viaje
        LEFT JOIN rutas r ON r.id_ruta = vt.id_ruta
        ORDER BY b.bus_id ASC, p.fecha_registro DESC NULLS LAST
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_viajes,
          COUNT(*) FILTER (WHERE estado_viaje IN ('EN_CAMINO', 'LLEGADA'))::int AS viajes_activos,
          COALESCE(
            ROUND(
              100.0 * COUNT(*) FILTER (
                WHERE fecha_hora_llegada_real IS NULL
                   OR fecha_hora_llegada_estimada IS NULL
                   OR fecha_hora_llegada_real <= fecha_hora_llegada_estimada + INTERVAL '5 minutes'
              ) / NULLIF(COUNT(*), 0),
              0
            ),
            100
          )::int AS puntualidad_porcentaje
        FROM viajes_transporte
      `),
    ])

    const buses = busesRes.rows
    const busesEnRuta = buses.filter((b) => b.estado_bus === 'EN_RUTA').length
    const stats = viajesStatsRes.rows[0] || {}

    return res.json({
      ok: true,
      data: {
        summary: {
          busesEnRuta,
          totalBuses: buses.length,
          llegadasATiempo: stats.puntualidad_porcentaje ?? 100,
          retrasoPromedio: '2 min',
        },
        buses,
      },
    })
  } catch (error) {
    console.error('Error en getGpsTracking:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar el seguimiento GPS.',
    })
  }
}
