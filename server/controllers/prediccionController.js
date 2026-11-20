import pool from '../db.js'

const NEAR_OLMOS_DISTRICTS = ['olmos', 'motupe']

export async function getPrediccion(req, res) {
  try {
    const [
      convocatoriasRes,
      topWorkersRes,
      busesRes,
      proveedoresRes,
      rutasRes,
      paraderosRes,
    ] = await Promise.all([
      pool.query(`
        SELECT
          c.id_convocatoria,
          c.titulo,
          COALESCE(c.campana, c.titulo) AS campana,
          TO_CHAR(c.fecha_trabajo, 'DD/MM/YYYY') AS fecha,
          c.turno,
          c.trabajadores_requeridos,
          c.estado,
          COALESCE(z.nombre, 'Sin zona') AS zona,
          COALESCE(d.nombre, 'Sin distrito') AS distrito
        FROM convocatorias c
        LEFT JOIN zonas z ON z.id_zona = c.id_zona
        LEFT JOIN distritos d ON d.id_distrito = c.id_distrito
        ORDER BY c.fecha_trabajo DESC, c.id_convocatoria DESC
      `),
      pool.query(`
        SELECT DISTINCT ON (t.id_trabajador)
          t.id_trabajador,
          t.numero_documento,
          t.nombres,
          t.apellidos,
          t.paradero_preferido,
          COALESCE(d.nombre, 'Sin distrito') AS distrito,
          COALESCE(pr.campana, pr.nombre, 'Campaña anterior') AS campana_anterior,
          COALESCE(rt.puntaje_hpw, 0)::float AS puntaje_hpw,
          COALESCE(rt.puntaje_productividad, 0)::float AS puntaje_productividad,
          COALESCE(rt.porcentaje_asistencia, 0)::float AS porcentaje_asistencia,
          COALESCE(rt.puntaje_calidad, 0)::float AS puntaje_calidad,
          COALESCE(rt.clasificacion_hpw, 'NO_CLASIFICADO') AS clasificacion_hpw,
          rt.notas_fuente
        FROM trabajadores t
        LEFT JOIN distritos d ON d.id_distrito = t.id_distrito
        LEFT JOIN rendimiento_trabajadores rt ON rt.id_trabajador = t.id_trabajador
        LEFT JOIN periodos_rendimiento pr ON pr.id_periodo = rt.id_periodo
        WHERE t.estado_trabajador = 'ACTIVO'
        ORDER BY t.id_trabajador, rt.puntaje_hpw DESC NULLS LAST, rt.fecha_evaluacion DESC NULLS LAST
      `),
      pool.query(`
        SELECT
          b.bus_id,
          b.id_proveedor,
          COALESCE(p.razon_social, 'Flota Propia') AS proveedor,
          b.numero_placa,
          COALESCE(b.codigo_interno, 'BUS-' || b.bus_id) AS codigo_interno,
          b.capacidad,
          b.estado_bus
        FROM buses b
        LEFT JOIN proveedores_transporte p ON p.id_proveedor = b.id_proveedor
        ORDER BY (b.estado_bus = 'DISPONIBLE') DESC, b.capacidad DESC
      `),
      pool.query(`
        SELECT
          p.id_proveedor,
          p.razon_social,
          p.ruc,
          p.nombre_contacto,
          p.telefono,
          COUNT(b.bus_id)::int AS total_buses,
          COALESCE(SUM(b.capacidad), 0)::int AS capacidad_total,
          COUNT(b.bus_id) FILTER (WHERE b.estado_bus = 'DISPONIBLE')::int AS buses_disponibles
        FROM proveedores_transporte p
        LEFT JOIN buses b ON b.id_proveedor = p.id_proveedor
        WHERE p.esta_activo = TRUE
        GROUP BY p.id_proveedor
        ORDER BY buses_disponibles DESC, capacidad_total DESC
      `),
      pool.query(`
        SELECT
          id_ruta,
          nombre,
          descripcion_origen,
          descripcion_destino,
          distancia_estimada_km::float AS distancia_estimada_km,
          duracion_estimada_minutos
        FROM rutas
        WHERE esta_activo = TRUE
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
    ])

    const convocatorias = convocatoriasRes.rows
    const requestedId = Number(req.query.id_convocatoria)
    const selectedConvocatoria =
      convocatorias.find((c) => Number(c.id_convocatoria) === requestedId) ||
      convocatorias[0] ||
      null

    const requeridos = Number(selectedConvocatoria?.trabajadores_requeridos || 0)

    // Ordenar mejores trabajadores por puntaje HPW descendente
    const mejoresTrabajadores = [...topWorkersRes.rows]
      .sort((a, b) => b.puntaje_hpw - a.puntaje_hpw)
      .map((w) => {
        const distLower = (w.distrito || '').toLowerCase()
        const requiereCampamento = !NEAR_OLMOS_DISTRICTS.some((d) =>
          distLower.includes(d)
        )
        return {
          ...w,
          requiere_campamento_olmos: requiereCampamento,
        }
      })

    const trabajadoresLejanos = mejoresTrabajadores.filter(
      (w) => w.requiere_campamento_olmos
    )

    // Predicción de buses disponibles vs requeridos
    const busesDisponibles = busesRes.rows.filter(
      (b) => b.estado_bus === 'DISPONIBLE'
    )
    const asientosDisponibles = busesDisponibles.reduce(
      (sum, b) => sum + Number(b.capacidad || 0),
      0
    )

    let acumulados = 0
    const busesRecomendados = []
    for (const b of busesDisponibles) {
      if (acumulados >= requeridos && busesRecomendados.length > 0) break
      busesRecomendados.push(b)
      acumulados += Number(b.capacidad || 0)
    }

    const deficitAsientos = Math.max(0, requeridos - asientosDisponibles)
    const busesExtraNecesarios =
      deficitAsientos > 0 ? Math.ceil(deficitAsientos / 45) : 0

    // Empresa recomendada para contratar más buses
    const empresaRecomendada = proveedoresRes.rows[0] || null

    // Ruta recomendada hacia campamentos de Olmos (prioriza rutas que conectan distritos lejanos con Olmos o mayor cobertura)
    const rutas = rutasRes.rows
    const rutaOlmos =
      rutas.find((r) =>
        `${r.nombre} ${r.descripcion_origen} ${r.descripcion_destino}`
          .toLowerCase()
          .includes('olmos')
      ) ||
      rutas[0] ||
      null

    const paraderosRutaRecomendada = rutaOlmos
      ? paraderosRes.rows.filter(
          (p) => Number(p.id_ruta) === Number(rutaOlmos.id_ruta)
        )
      : []

    return res.json({
      ok: true,
      data: {
        convocatorias,
        selectedConvocatoria,
        resumen: {
          trabajadoresRequeridos: requeridos,
          asientosDisponibles,
          deficitAsientos,
          busesExtraNecesarios,
          trabajadoresParaCampamentoOlmos: trabajadoresLejanos.length,
        },
        mejoresTrabajadores,
        busesDisponibles,
        busesRecomendados,
        proveedores: proveedoresRes.rows,
        empresaRecomendada,
        rutaRecomendada: rutaOlmos
          ? {
              ...rutaOlmos,
              paraderos: paraderosRutaRecomendada,
              objetivo:
                'Recojo de trabajadores de zonas lejanas hacia campamentos de Olmos',
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error en getPrediccion:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al generar la predicción operativa.',
    })
  }
}

export async function savePrediccionRun(req, res) {
  const { id_convocatoria, resumen_salida = {} } = req.body ?? {}

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO ejecuciones_algoritmo (
        tipo_ejecucion, id_convocatoria, nombre_algoritmo, version_algoritmo,
        resumen_salida, estado_ejecucion, fecha_fin_ejecucion, ejecutado_por
      )
      VALUES ('PREDICCION', $1, 'Predictor HPW & Flota Olmos', '2.0', $2::jsonb, 'COMPLETADO', NOW(), $3)
      RETURNING id_ejecucion_algoritmo
      `,
      [
        id_convocatoria ? Number(id_convocatoria) : null,
        JSON.stringify(resumen_salida),
        req.user?.id || null,
      ]
    )

    return res.status(201).json({
      ok: true,
      message: 'Predicción registrada en ejecuciones_algoritmo.',
      id_ejecucion_algoritmo: rows[0].id_ejecucion_algoritmo,
    })
  } catch (error) {
    console.error('Error en savePrediccionRun:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al guardar la ejecución de predicción.',
    })
  }
}
