import pool from '../db.js'

export async function getReportesData(req, res) {
  const period = req.query.period || '30d'
  const fromDate = req.query.from || null
  const toDate = req.query.to || null
  const idZona = req.query.id_zona ? Number(req.query.id_zona) : null

  const intervalMap = {
    '30d': '30 days',
    '3m': '3 months',
    '1y': '1 year',
  }
  const pgInterval = intervalMap[period] || '30 days'

  try {
    const [
      indicadoresRes,
      serieRes,
      zonasPieRes,
      puntualidadRes,
      zonasCatalogoRes,
      costosTipoRes,
      resumenZonaRes,
      topWorkersRes,
    ] = await Promise.all([
      pool.query('SELECT * FROM vista_indicadores_dashboard'),
      pool.query(
        `
        SELECT
          c.id_convocatoria,
          TO_CHAR(c.fecha_trabajo, 'DD/MM') AS label,
          COALESCE(v.porcentaje_reingreso_hpw, 0)::float AS value
        FROM convocatorias c
        LEFT JOIN vista_reingreso_hpw v ON v.id_convocatoria = c.id_convocatoria
        WHERE ($1::BIGINT IS NULL OR c.id_zona = $1)
          AND (
            ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND c.fecha_trabajo BETWEEN $2::DATE AND $3::DATE)
            OR ($2::DATE IS NULL AND (
              c.fecha_trabajo >= CURRENT_DATE - $4::INTERVAL
              OR (SELECT COUNT(*) FROM convocatorias WHERE fecha_trabajo >= CURRENT_DATE - $4::INTERVAL) = 0
            ))
          )
        ORDER BY c.fecha_trabajo ASC, c.id_convocatoria ASC
        `,
        [idZona, fromDate, toDate, pgInterval]
      ),
      pool.query(
        `
        SELECT
          COALESCE(z.nombre, 'Sin zona') AS zona,
          COUNT(c.id_convocatoria)::int AS total
        FROM zonas z
        LEFT JOIN convocatorias c
          ON c.id_zona = z.id_zona
         AND ($1::DATE IS NULL OR $2::DATE IS NULL OR c.fecha_trabajo BETWEEN $1::DATE AND $2::DATE)
        WHERE ($3::BIGINT IS NULL OR z.id_zona = $3)
        GROUP BY z.nombre
        ORDER BY total DESC
        `,
        [fromDate, toDate, idZona]
      ),
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
      pool.query(
        'SELECT id_zona, nombre FROM zonas WHERE esta_activo = TRUE ORDER BY nombre'
      ),
      pool.query(`
        SELECT
          tipo_costo,
          COALESCE(SUM(importe), 0)::float AS total
        FROM costos_transporte
        GROUP BY tipo_costo
        ORDER BY total DESC
      `),
      pool.query(
        `
        SELECT
          z.id_zona,
          z.nombre AS zona,
          COUNT(DISTINCT c.id_convocatoria)::int AS convocatorias,
          COALESCE(SUM(DISTINCT c.trabajadores_requeridos), 0)::int AS requeridos,
          COUNT(DISTINCT vt.id_viaje)::int AS viajes,
          COALESCE(SUM(ct.importe), 0)::float AS costo_total
        FROM zonas z
        LEFT JOIN convocatorias c
          ON c.id_zona = z.id_zona
         AND ($1::DATE IS NULL OR $2::DATE IS NULL OR c.fecha_trabajo BETWEEN $1::DATE AND $2::DATE)
        LEFT JOIN viajes_transporte vt ON vt.id_convocatoria = c.id_convocatoria
        LEFT JOIN costos_transporte ct ON ct.id_viaje = vt.id_viaje
        WHERE ($3::BIGINT IS NULL OR z.id_zona = $3)
        GROUP BY z.id_zona, z.nombre
        ORDER BY convocatorias DESC, z.nombre ASC
        `,
        [fromDate, toDate, idZona]
      ),
      pool.query(`
        SELECT DISTINCT ON (t.id_trabajador)
          t.id_trabajador,
          t.numero_documento,
          t.nombres,
          t.apellidos,
          COALESCE(d.nombre, 'Sin distrito') AS distrito,
          COALESCE(rt.puntaje_hpw, 0)::float AS puntaje_hpw,
          COALESCE(rt.porcentaje_asistencia, 0)::float AS porcentaje_asistencia,
          COALESCE(rt.clasificacion_hpw, 'NO_CLASIFICADO') AS clasificacion_hpw
        FROM trabajadores t
        LEFT JOIN distritos d ON d.id_distrito = t.id_distrito
        JOIN rendimiento_trabajadores rt ON rt.id_trabajador = t.id_trabajador
        ORDER BY t.id_trabajador, rt.puntaje_hpw DESC NULLS LAST
      `),
    ])

    const ind = indicadoresRes.rows[0] || {}
    const totalZonas = zonasPieRes.rows.reduce((sum, z) => sum + z.total, 0)
    const distribucionZonas = zonasPieRes.rows.map((z) => ({
      name: z.zona,
      total: z.total,
      percent: totalZonas > 0 ? Math.round((z.total / totalZonas) * 100) : 0,
    }))

    const totalCostos = costosTipoRes.rows.reduce((s, c) => s + c.total, 0)
    const costosPorTipo = costosTipoRes.rows.map((c) => ({
      tipo: c.tipo_costo,
      total: c.total,
      percent: totalCostos > 0 ? Math.round((c.total / totalCostos) * 100) : 0,
    }))

    const topTrabajadores = [...topWorkersRes.rows]
      .sort((a, b) => b.puntaje_hpw - a.puntaje_hpw)
      .slice(0, 8)

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
        costosPorTipo,
        resumenPorZona: resumenZonaRes.rows,
        topTrabajadores,
        zonas: zonasCatalogoRes.rows,
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
