import pool from '../db.js'

export async function listConvocatorias(_req, res) {
  try {
    const [itemsRes, zonasDistribRes, zonasRes, distritosRes] = await Promise.all([
      pool.query(`
        SELECT
          c.id_convocatoria,
          c.titulo,
          c.campana,
          TO_CHAR(c.fecha_trabajo, 'DD/MM/YYYY') AS fecha,
          c.fecha_trabajo,
          c.turno,
          c.trabajadores_requeridos,
          c.estado,
          c.id_zona,
          COALESCE(z.nombre, 'Sin zona') AS zona,
          c.id_distrito,
          COALESCE(d.nombre, 'Sin distrito') AS distrito
        FROM convocatorias c
        LEFT JOIN zonas z ON z.id_zona = c.id_zona
        LEFT JOIN distritos d ON d.id_distrito = c.id_distrito
        ORDER BY c.fecha_trabajo DESC, c.id_convocatoria DESC
      `),
      pool.query(`
        SELECT
          COALESCE(z.nombre, 'Sin zona') AS zona,
          COUNT(*)::int AS total
        FROM convocatorias c
        LEFT JOIN zonas z ON z.id_zona = c.id_zona
        GROUP BY z.nombre
        ORDER BY total DESC
      `),
      pool.query('SELECT id_zona, nombre FROM zonas WHERE esta_activo = TRUE ORDER BY nombre'),
      pool.query('SELECT id_distrito, nombre FROM distritos WHERE esta_activo = TRUE ORDER BY nombre'),
    ])

    const items = itemsRes.rows
    const total = items.length
    const confirmadas = items.filter((i) =>
      ['PROGRAMADA', 'ENVIADA'].includes(i.estado)
    ).length
    const enProceso = items.filter((i) =>
      ['EN_PROCESO', 'BORRADOR'].includes(i.estado)
    ).length
    const canceladas = items.filter((i) => i.estado === 'CANCELADA').length

    const totalZonas = zonasDistribRes.rows.reduce((sum, z) => sum + z.total, 0)
    const distribucionZonas = zonasDistribRes.rows.map((z) => ({
      name: z.zona,
      total: z.total,
      percent: totalZonas > 0 ? Math.round((z.total / totalZonas) * 100) : 0,
    }))

    return res.json({
      ok: true,
      data: {
        summary: {
          total,
          confirmadas,
          enProceso,
          canceladas,
        },
        items,
        distribucionZonas,
        catalogos: {
          zonas: zonasRes.rows,
          distritos: distritosRes.rows,
        },
      },
    })
  } catch (error) {
    console.error('Error en listConvocatorias:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar convocatorias.',
    })
  }
}

export async function createConvocatoria(req, res) {
  const {
    titulo,
    campana = 'Campaña Actual',
    fecha_trabajo,
    turno = 'MANANA',
    id_zona,
    id_distrito,
    trabajadores_requeridos,
    estado = 'PROGRAMADA',
  } = req.body ?? {}

  if (!titulo || !fecha_trabajo || !trabajadores_requeridos) {
    return res.status(400).json({
      ok: false,
      message: 'Título, fecha y trabajadores requeridos son obligatorios.',
    })
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO convocatorias (
        titulo, campana, fecha_trabajo, turno, id_zona, id_distrito,
        trabajadores_requeridos, estado, creado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id_convocatoria
      `,
      [
        titulo.trim(),
        campana,
        fecha_trabajo,
        turno,
        id_zona || null,
        id_distrito || null,
        Number(trabajadores_requeridos),
        estado,
        req.user?.id || null,
      ]
    )

    return res.status(201).json({
      ok: true,
      message: 'Convocatoria registrada correctamente.',
      id_convocatoria: rows[0].id_convocatoria,
    })
  } catch (error) {
    console.error('Error en createConvocatoria:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar la convocatoria.',
    })
  }
}
