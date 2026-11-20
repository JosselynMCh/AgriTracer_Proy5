import pool from '../db.js'

export async function getDashboardData(_req, res) {
  try {
    const [
      indicadoresRes,
      distritosConvocadosRes,
      convocadosTotalRes,
      recientesRes,
      reingresoSerieRes,
      costosSerieRes,
      alertasRes,
      paraderosRes,
      busesGpsRes,
    ] = await Promise.all([
      pool.query('SELECT * FROM vista_indicadores_dashboard'),
      pool.query(`
        SELECT COUNT(DISTINCT t.id_distrito)::int AS cubiertos
        FROM trabajadores t
        WHERE t.estado_trabajador = 'ACTIVO' AND t.id_distrito IS NOT NULL
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_candidatos,
          COALESCE((SELECT SUM(trabajadores_requeridos)::int FROM convocatorias), 0) AS total_requeridos
        FROM candidatos_convocatoria
      `),
      pool.query(`
        SELECT
          c.id_convocatoria,
          c.titulo,
          TO_CHAR(c.fecha_trabajo, 'DD/MM/YYYY') AS fecha,
          COALESCE(d.nombre, z.nombre, 'Sin zona') AS zona,
          c.turno,
          c.trabajadores_requeridos AS hpw_convocados,
          c.estado
        FROM convocatorias c
        LEFT JOIN distritos d ON d.id_distrito = c.id_distrito
        LEFT JOIN zonas z ON z.id_zona = c.id_zona
        ORDER BY c.fecha_trabajo DESC, c.id_convocatoria DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          c.id_convocatoria,
          TO_CHAR(c.fecha_trabajo, 'DD/MM') AS label,
          COALESCE(v.porcentaje_reingreso_hpw, 0)::float AS value
        FROM convocatorias c
        LEFT JOIN vista_reingreso_hpw v ON v.id_convocatoria = c.id_convocatoria
        ORDER BY c.fecha_trabajo ASC, c.id_convocatoria ASC
        LIMIT 6
      `),
      pool.query(`
        SELECT
          v.id_viaje,
          TO_CHAR(COALESCE(vt.fecha_hora_salida, NOW()), 'DD/MM') AS label,
          COALESCE(v.costo_por_persona, 0)::float AS value
        FROM vista_costo_transporte_por_persona v
        JOIN viajes_transporte vt ON vt.id_viaje = v.id_viaje
        WHERE v.costo_por_persona IS NOT NULL
        ORDER BY vt.fecha_hora_salida ASC, v.id_viaje ASC
        LIMIT 6
      `),
      pool.query(`
        SELECT
          id_notificacion,
          titulo,
          message,
          canal,
          estado_notificacion,
          fecha_creacion
        FROM notificaciones
        ORDER BY fecha_creacion DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          p.id_paradero,
          p.id_ruta,
          r.nombre AS ruta_nombre,
          p.nombre_paradero,
          p.latitud::float AS latitud,
          p.longitud::float AS longitud,
          p.orden_paradero
        FROM paraderos_ruta p
        JOIN rutas r ON r.id_ruta = p.id_ruta
        WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL
        ORDER BY p.id_ruta ASC, p.orden_paradero ASC
      `),
      pool.query(`
        SELECT DISTINCT ON (b.bus_id)
          b.bus_id,
          COALESCE(b.codigo_interno, 'BUS-' || b.bus_id) AS codigo_bus,
          b.numero_placa AS placa,
          b.estado_bus,
          p.latitud::float AS latitud,
          p.longitud::float AS longitud,
          COALESCE(p.velocidad_kmh, 0)::float AS velocidad_kmh
        FROM buses b
        JOIN posiciones_gps p ON p.bus_id = b.bus_id
        ORDER BY b.bus_id ASC, p.fecha_registro DESC
      `),
    ])

    const ind = indicadoresRes.rows[0] || {}
    const cubiertos = distritosConvocadosRes.rows[0]?.cubiertos || 0
    const distritosActivos = Number(ind.distritos_activos || 0)
    const convTotals = convocadosTotalRes.rows[0] || {}
    const trabajadoresConvocados =
      convTotals.total_requeridos > 0
        ? convTotals.total_requeridos
        : convTotals.total_candidatos || 0

    return res.json({
      ok: true,
      data: {
        kpis: {
          reingresoHpw: Number(ind.porcentaje_promedio_reingreso_hpw || 0),
          costoPromedio: Number(ind.costo_promedio_transporte_persona || 0),
          distritosCubiertos: cubiertos,
          distritosTotales: distritosActivos,
          trabajadoresConvocados,
        },
        convocatoriasRecientes: recientesRes.rows,
        reingresoSerie: reingresoSerieRes.rows,
        costosSerie: costosSerieRes.rows,
        alertas: alertasRes.rows,
        mapa: {
          paraderos: paraderosRes.rows,
          buses: busesGpsRes.rows,
        },
      },
    })
  } catch (error) {
    console.error('Error en getDashboardData:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar los datos del dashboard.',
    })
  }
}
