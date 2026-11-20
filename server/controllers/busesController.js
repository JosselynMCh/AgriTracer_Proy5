import pool from '../db.js'

export async function listBusesAndAssignments(_req, res) {
  try {
    const [busesRes, proveedoresRes, rutasRes, convocatoriasRes, viajesRes] =
      await Promise.all([
        pool.query(`
          SELECT
            b.bus_id,
            b.id_proveedor,
            COALESCE(p.razon_social, 'Propio / Sin proveedor') AS proveedor,
            b.numero_placa,
            COALESCE(b.codigo_interno, 'BUS-' || b.bus_id) AS codigo_interno,
            b.capacidad,
            b.id_dispositivo_gps,
            b.proveedor_gps,
            b.estado_bus
          FROM buses b
          LEFT JOIN proveedores_transporte p ON p.id_proveedor = b.id_proveedor
          ORDER BY b.bus_id ASC
        `),
        pool.query(
          'SELECT id_proveedor, razon_social FROM proveedores_transporte WHERE esta_activo = TRUE ORDER BY razon_social'
        ),
        pool.query(
          'SELECT id_ruta, nombre, descripcion_origen, descripcion_destino FROM rutas WHERE esta_activo = TRUE ORDER BY nombre'
        ),
        pool.query(`
          SELECT
            id_convocatoria,
            titulo,
            TO_CHAR(fecha_trabajo, 'DD/MM/YYYY') AS fecha,
            trabajadores_requeridos,
            estado
          FROM convocatorias
          WHERE estado IN ('PROGRAMADA','ENVIADA','EN_PROCESO','BORRADOR')
          ORDER BY fecha_trabajo DESC
        `),
        pool.query(`
          SELECT
            vt.id_viaje,
            vt.id_convocatoria,
            c.titulo AS convocatoria_titulo,
            vt.id_ruta,
            r.nombre AS ruta_nombre,
            vt.bus_id,
            COALESCE(b.codigo_interno, 'BUS-' || b.bus_id) AS codigo_bus,
            b.numero_placa,
            b.capacidad,
            vt.pasajeros_previstos,
            TO_CHAR(vt.fecha_hora_salida, 'DD/MM/YYYY HH24:MI') AS salida,
            vt.estado_viaje
          FROM viajes_transporte vt
          JOIN buses b ON b.bus_id = vt.bus_id
          JOIN rutas r ON r.id_ruta = vt.id_ruta
          JOIN convocatorias c ON c.id_convocatoria = vt.id_convocatoria
          ORDER BY vt.id_viaje DESC
          LIMIT 20
        `),
      ])

    const buses = busesRes.rows
    const totalAsientos = buses.reduce((sum, b) => sum + Number(b.capacidad || 0), 0)
    const disponibles = buses.filter((b) => b.estado_bus === 'DISPONIBLE').length
    const asignadosEnRuta = buses.filter((b) =>
      ['ASIGNADO', 'EN_RUTA'].includes(b.estado_bus)
    ).length

    return res.json({
      ok: true,
      data: {
        summary: {
          totalBuses: buses.length,
          disponibles,
          asignadosEnRuta,
          totalAsientos,
        },
        buses,
        viajes: viajesRes.rows,
        catalogos: {
          proveedores: proveedoresRes.rows,
          rutas: rutasRes.rows,
          convocatorias: convocatoriasRes.rows,
        },
      },
    })
  } catch (error) {
    console.error('Error en listBusesAndAssignments:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al cargar buses y asignaciones.',
    })
  }
}

export async function createBus(req, res) {
  const {
    id_proveedor,
    numero_placa,
    codigo_interno,
    capacidad,
    id_dispositivo_gps,
    proveedor_gps = 'CERTISAT',
    estado_bus = 'DISPONIBLE',
  } = req.body ?? {}

  if (!numero_placa?.trim() || !capacidad || Number(capacidad) <= 0) {
    return res.status(400).json({
      ok: false,
      message: 'Número de placa y capacidad de asientos (> 0) son obligatorios.',
    })
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO buses (
        id_proveedor, numero_placa, codigo_interno, capacidad,
        id_dispositivo_gps, proveedor_gps, estado_bus
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING bus_id
      `,
      [
        id_proveedor ? Number(id_proveedor) : null,
        numero_placa.trim().toUpperCase(),
        codigo_interno?.trim() || null,
        Number(capacidad),
        id_dispositivo_gps?.trim() || null,
        proveedor_gps?.trim() || 'CERTISAT',
        estado_bus,
      ]
    )

    return res.status(201).json({
      ok: true,
      message: 'Bus registrado correctamente en Neon.',
      bus_id: rows[0].bus_id,
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un bus con esa placa, código interno o ID GPS.',
      })
    }
    console.error('Error en createBus:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar el bus.',
    })
  }
}

export async function assignBusToRoute(req, res) {
  const {
    id_convocatoria,
    id_ruta,
    bus_id,
    pasajeros_previstos,
    fecha_hora_salida,
  } = req.body ?? {}

  if (!id_convocatoria || !id_ruta || !bus_id) {
    return res.status(400).json({
      ok: false,
      message: 'Debes seleccionar convocatoria, ruta y bus.',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const busRes = await client.query(
      'SELECT capacidad, estado_bus FROM buses WHERE bus_id = $1 LIMIT 1',
      [Number(bus_id)]
    )
    const bus = busRes.rows[0]

    if (!bus) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: 'Bus no encontrado.' })
    }

    const pasajeros = Number(pasajeros_previstos || bus.capacidad)
    if (pasajeros > bus.capacidad) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        ok: false,
        message: `Los pasajeros previstos (${pasajeros}) superan la capacidad del bus (${bus.capacidad} asientos).`,
      })
    }

    const viajeRes = await client.query(
      `
      INSERT INTO viajes_transporte (
        id_convocatoria, id_ruta, bus_id, fecha_hora_salida,
        pasajeros_previstos, estado_viaje, asignado_por
      )
      VALUES ($1, $2, $3, $4, $5, 'PROGRAMADO', $6)
      RETURNING id_viaje
      `,
      [
        Number(id_convocatoria),
        Number(id_ruta),
        Number(bus_id),
        fecha_hora_salida || new Date().toISOString(),
        pasajeros,
        req.user?.id || null,
      ]
    )

    await client.query(
      `UPDATE buses SET estado_bus = 'ASIGNADO' WHERE bus_id = $1 AND estado_bus = 'DISPONIBLE'`,
      [Number(bus_id)]
    )

    await client.query('COMMIT')
    return res.status(201).json({
      ok: true,
      message: 'Bus asignado a la ruta correctamente.',
      id_viaje: viajeRes.rows[0].id_viaje,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error en assignBusToRoute:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al asignar el bus a la ruta.',
    })
  } finally {
    client.release()
  }
}
