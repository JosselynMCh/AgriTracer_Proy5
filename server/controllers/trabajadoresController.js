import pool from '../db.js'

export async function listTrabajadores(_req, res) {
  try {
    const [workersRes, distritosRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT ON (t.id_trabajador)
          t.id_trabajador,
          t.tipo_documento,
          t.numero_documento,
          t.nombres,
          t.apellidos,
          t.telefono,
          t.estado_trabajador,
          t.paradero_preferido,
          COALESCE(d.nombre, 'Sin distrito') AS distrito,
          COALESCE(z.nombre, 'Sin zona') AS zona,
          COALESCE(rt.clasificacion_hpw, 'NO_CLASIFICADO') AS clasificacion_hpw,
          rt.puntaje_hpw
        FROM trabajadores t
        LEFT JOIN distritos d ON d.id_distrito = t.id_distrito
        LEFT JOIN zonas_distritos zd ON zd.id_distrito = d.id_distrito
        LEFT JOIN zonas z ON z.id_zona = zd.id_zona
        LEFT JOIN rendimiento_trabajadores rt ON rt.id_trabajador = t.id_trabajador
        ORDER BY t.id_trabajador ASC, rt.fecha_evaluacion DESC NULLS LAST
      `),
      pool.query(
        'SELECT id_distrito, nombre FROM distritos WHERE esta_activo = TRUE ORDER BY nombre'
      ),
    ])

    return res.json({
      ok: true,
      data: {
        items: workersRes.rows,
        distritos: distritosRes.rows,
      },
    })
  } catch (error) {
    console.error('Error en listTrabajadores:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar los trabajadores.',
    })
  }
}

export async function createTrabajador(req, res) {
  const {
    tipo_documento = 'DNI',
    numero_documento,
    nombres,
    apellidos,
    telefono,
    id_distrito,
    estado_trabajador = 'ACTIVO',
  } = req.body ?? {}

  if (!numero_documento || !nombres || !apellidos) {
    return res.status(400).json({
      ok: false,
      message: 'Número de documento, nombres y apellidos son obligatorios.',
    })
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO trabajadores (
        tipo_documento, numero_documento, nombres, apellidos,
        telefono, id_distrito, estado_trabajador
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_trabajador
      `,
      [
        tipo_documento,
        numero_documento.trim(),
        nombres.trim(),
        apellidos.trim(),
        telefono?.trim() || null,
        id_distrito || null,
        estado_trabajador,
      ]
    )

    return res.status(201).json({
      ok: true,
      message: 'Trabajador registrado correctamente.',
      id_trabajador: rows[0].id_trabajador,
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un trabajador con ese número de documento.',
      })
    }
    console.error('Error en createTrabajador:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar el trabajador.',
    })
  }
}

export async function getTrabajadorDetalle(req, res) {
  const idTrabajador = Number(req.params.id)
  if (!idTrabajador) {
    return res.status(400).json({ ok: false, message: 'ID de trabajador inválido.' })
  }

  try {
    const [rendimientoRes, convocatoriasRes] = await Promise.all([
      pool.query(
        `
        SELECT
          rt.performance_id,
          pr.nombre AS periodo_nombre,
          COALESCE(pr.campana, pr.nombre) AS campana,
          TO_CHAR(pr.fecha_inicio, 'DD/MM/YYYY') AS fecha_inicio,
          TO_CHAR(pr.fecha_fin, 'DD/MM/YYYY') AS fecha_fin,
          rt.dias_trabajados::float AS dias_trabajados,
          rt.puntaje_productividad::float AS puntaje_productividad,
          rt.porcentaje_asistencia::float AS porcentaje_asistencia,
          rt.puntaje_calidad::float AS puntaje_calidad,
          rt.puntaje_hpw::float AS puntaje_hpw,
          rt.clasificacion_hpw,
          rt.notas_fuente
        FROM rendimiento_trabajadores rt
        JOIN periodos_rendimiento pr ON pr.id_periodo = rt.id_periodo
        WHERE rt.id_trabajador = $1
        ORDER BY pr.fecha_inicio ASC, rt.performance_id ASC
        `,
        [idTrabajador]
      ),
      pool.query(
        `
        SELECT
          cc.id_candidato,
          c.titulo,
          COALESCE(c.campana, 'Sin campaña') AS campana,
          TO_CHAR(c.fecha_trabajo, 'DD/MM/YYYY') AS fecha,
          cc.puntaje_hpw::float AS puntaje_hpw,
          cc.puntaje_seleccion::float AS puntaje_seleccion,
          cc.motivo_seleccion,
          cc.estado_invitacion,
          cc.estado_asistencia
        FROM candidatos_convocatoria cc
        JOIN convocatorias c ON c.id_convocatoria = cc.id_convocatoria
        WHERE cc.id_trabajador = $1
        ORDER BY c.fecha_trabajo DESC
        `,
        [idTrabajador]
      ),
    ])

    return res.json({
      ok: true,
      data: {
        rendimientos: rendimientoRes.rows,
        convocatorias: convocatoriasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error en getTrabajadorDetalle:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar el detalle de rendimiento del trabajador.',
    })
  }
}
