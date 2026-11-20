import pool from '../db.js'

export async function listRutas(_req, res) {
  try {
    const [rutasRes, paraderosRes, busesRes, costoRes] = await Promise.all([
      pool.query(`
        SELECT
          id_ruta,
          nombre,
          descripcion_origen,
          descripcion_destino,
          distancia_estimada_km,
          duracion_estimada_minutos,
          esta_activo
        FROM rutas
        ORDER BY id_ruta ASC
      `),
      pool.query(`
        SELECT
          id_paradero,
          id_ruta,
          nombre_paradero,
          latitud::float AS latitud,
          longitud::float AS longitud,
          orden_paradero
        FROM paraderos_ruta
        WHERE latitud IS NOT NULL AND longitud IS NOT NULL
        ORDER BY id_ruta ASC, orden_paradero ASC
      `),
      pool.query(`
        SELECT DISTINCT ON (b.bus_id)
          b.bus_id,
          b.numero_placa,
          COALESCE(b.codigo_interno, 'BUS-' || b.bus_id) AS codigo_bus,
          b.capacidad,
          b.estado_bus,
          p.latitud::float AS latitud,
          p.longitud::float AS longitud
        FROM buses b
        LEFT JOIN posiciones_gps p ON p.bus_id = b.bus_id
        ORDER BY b.bus_id ASC, p.fecha_registro DESC NULLS LAST
      `),
      pool.query(`
        SELECT ROUND(AVG(costo_por_persona), 2)::float AS costo_promedio
        FROM vista_costo_transporte_por_persona
        WHERE costo_por_persona IS NOT NULL
      `),
    ])

    const rutas = rutasRes.rows
    const buses = busesRes.rows
    const busesActivos = buses.filter((b) =>
      ['DISPONIBLE', 'ASIGNADO', 'EN_RUTA'].includes(b.estado_bus)
    ).length
    const rutasActivas = rutas.filter((r) => r.esta_activo).length

    return res.json({
      ok: true,
      data: {
        summary: {
          busesActivos,
          totalBuses: buses.length,
          rutasActivas,
          totalRutas: rutas.length,
          costoPromedio: costoRes.rows[0]?.costo_promedio || 0,
        },
        rutas,
        paraderos: paraderosRes.rows,
        buses,
      },
    })
  } catch (error) {
    console.error('Error en listRutas:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar rutas y transporte.',
    })
  }
}

export async function createRuta(req, res) {
  const {
    nombre,
    descripcion_origen,
    descripcion_destino,
    distancia_estimada_km,
    duracion_estimada_minutos,
    esta_activo = true,
    origen_coords,
    destino_coords,
  } = req.body ?? {}

  if (!nombre?.trim() || !descripcion_origen?.trim() || !descripcion_destino?.trim()) {
    return res.status(400).json({
      ok: false,
      message: 'Nombre, origen y destino de la ruta son obligatorios.',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const rutaResult = await client.query(
      `
      INSERT INTO rutas (
        nombre, descripcion_origen, descripcion_destino,
        distancia_estimada_km, duracion_estimada_minutos, esta_activo
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_ruta
      `,
      [
        nombre.trim(),
        descripcion_origen.trim(),
        descripcion_destino.trim(),
        distancia_estimada_km ? Number(distancia_estimada_km) : null,
        duracion_estimada_minutos ? Number(duracion_estimada_minutos) : null,
        Boolean(esta_activo),
      ]
    )

    const idRuta = rutaResult.rows[0].id_ruta

    if (
      origen_coords &&
      typeof origen_coords.lat === 'number' &&
      typeof origen_coords.lng === 'number'
    ) {
      await client.query(
        `
        INSERT INTO paraderos_ruta (
          id_ruta, nombre_paradero, latitud, longitud, orden_paradero
        )
        VALUES ($1, $2, $3, $4, 1)
        `,
        [idRuta, `Paradero ${descripcion_origen.trim()}`, origen_coords.lat, origen_coords.lng]
      )
    }

    if (
      destino_coords &&
      typeof destino_coords.lat === 'number' &&
      typeof destino_coords.lng === 'number'
    ) {
      await client.query(
        `
        INSERT INTO paraderos_ruta (
          id_ruta, nombre_paradero, latitud, longitud, orden_paradero
        )
        VALUES ($1, $2, $3, $4, 2)
        `,
        [idRuta, `Destino ${descripcion_destino.trim()}`, destino_coords.lat, destino_coords.lng]
      )
    }

    await client.query('COMMIT')
    return res.status(201).json({
      ok: true,
      message: 'Ruta registrada correctamente en Neon.',
      id_ruta: idRuta,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error en createRuta:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar la ruta.',
    })
  } finally {
    client.release()
  }
}

export async function updateRuta(req, res) {
  const idRuta = Number(req.params.id)
  const {
    nombre,
    descripcion_origen,
    descripcion_destino,
    distancia_estimada_km,
    duracion_estimada_minutos,
    esta_activo,
  } = req.body ?? {}

  if (!idRuta || !nombre?.trim()) {
    return res.status(400).json({
      ok: false,
      message: 'Datos inválidos para actualizar la ruta.',
    })
  }

  try {
    const { rowCount } = await pool.query(
      `
      UPDATE rutas
      SET
        nombre = $1,
        descripcion_origen = $2,
        descripcion_destino = $3,
        distancia_estimada_km = $4,
        duracion_estimada_minutos = $5,
        esta_activo = $6
      WHERE id_ruta = $7
      `,
      [
        nombre.trim(),
        descripcion_origen?.trim() || '',
        descripcion_destino?.trim() || '',
        distancia_estimada_km ? Number(distancia_estimada_km) : null,
        duracion_estimada_minutos ? Number(duracion_estimada_minutos) : null,
        Boolean(esta_activo),
        idRuta,
      ]
    )

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Ruta no encontrada.' })
    }

    return res.json({
      ok: true,
      message: 'Ruta actualizada correctamente.',
    })
  } catch (error) {
    console.error('Error en updateRuta:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar la ruta.',
    })
  }
}
