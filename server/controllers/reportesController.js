import pool from '../db.js'

export async function getReportesData(req, res) {
  const period = req.query.period || '30d'
  const intervalMap = {
    '30d': '30 days',
    '3m': '3 months',
    '1y': '1 year',
  }
  const pgInterval = intervalMap[period] || '30 days'

  try {
    const [indicadoresRes, serieRes, zonasRes, puntualidadRes] =
      await Promise.all([
        pool.query('SELECT * FROM vista_indicadores_dashboard'),
        pool.query(
          `
          SELECT
            c.id_convocatoria,
            TO_CHAR(c.fecha_trabajo, 'DD/MM') AS label,
            COALESCE(v.porcentaje_reingreso_hpw, 0)::float AS value
          FROM convocatorias c
          LEFT JOIN vista_reingreso_hpw v ON v.id_convocatoria = c.id_convocatoria
          WHERE c.fecha_trabajo >= CURRENT_DATE - $1::INTERVAL
             OR (SELECT COUNT(*) FROM convocatorias WHERE fecha_trabajo >= CURRENT_DATE - $1::INTERVAL) = 0
          ORDER BY c.fecha_trabajo ASC, c.id_convocatoria ASC
          `,
          [pgInterval]
        ),
        pool.query(`
          SELECT
            COALESCE(z.nombre, 'Sin zona') AS zona,
            COUNT(c.id_convocatoria)::int AS total
          FROM zonas z
          LEFT JOIN convocatorias c ON c.id_zona = z.id_zona
          GROUP BY z.nombre
          ORDER BY total DESC
        `),
        pool.query(`
          SELECT
            COALESCE(
              ROUND(
                100.0 * COUNT(*) FILTER (
                  WHERE fecha_hora_llegada_real IS NULL
                     OR fecha_hora_llegada_estimada IS NULL
                     OR fecha_hora_llegada_real <= fecha_hora_llegada_estimada + INTERVAL '5 minutes'
                ) / NULLIF(COUNT(*), 0),
                1
              ),
              100.0
            )::float AS puntualidad
          FROM viajes_transporte
        `),
      ])

    const ind = indicadoresRes.rows[0] || {}
    const totalZonas = zonasRes.rows.reduce((sum, z) => sum + z.total, 0)
    const distribucionZonas = zonasRes.rows.map((z) => ({
      name: z.zona,
      total: z.total,
      percent: totalZonas > 0 ? Math.round((z.total / totalZonas) * 100) : 0,
    }))

    return res.json({
      ok: true,
      data: {
        kpis: {
          costoPromedio: Number(ind.costo_promedio_transporte_persona || 0),
          reingresoHpw: Number(ind.porcentaje_promedio_reingreso_hpw || 0),
          puntualidadBuses: puntualidadRes.rows[0]?.puntualidad ?? 100,
          trabajadoresActivos: Number(ind.trabajadores_activos || 0),
        },
        reingresoSerie: serieRes.rows,
        distribucionZonas,
      },
    })
  } catch (error) {
    console.error('Error en getReportesData:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al generar reportes y analítica.',
    })
  }
}
