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
      costoBaseRes,
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
          t.tipo_documento,
          t.numero_documento,
          t.nombres,
          t.apellidos,
          t.telefono,
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
      pool.query(`
        SELECT COALESCE(
          (SELECT ROUND(AVG(costo_por_persona), 2)::float FROM vista_costo_transporte_por_persona WHERE costo_por_persona IS NOT NULL),
          18.60
        ) AS costo_por_persona
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

    // Predicción de buses disponibles vs requeridos (Best-Fit para minimizar asientos desperdiciados y costos)
    const costoPorAsiento = Number(costoBaseRes.rows[0]?.costo_por_persona || 18.6)
    const busesDisponibles = busesRes.rows.filter(
      (b) => b.estado_bus === 'DISPONIBLE'
    )
    const asientosDisponibles = busesDisponibles.reduce(
      (sum, b) => sum + Number(b.capacidad || 0),
      0
    )

    // Ordenar de menor a mayor capacidad para Best-Fit
    const busesAsc = [...busesDisponibles].sort(
      (a, b) => Number(a.capacidad) - Number(b.capacidad)
    )
    const busesDesc = [...busesDisponibles].sort(
      (a, b) => Number(b.capacidad) - Number(a.capacidad)
    )

    let busesRecomendados = []
    let tipoSeleccion = 'SIN_FLOTA'
    const margenMaximoExceso = Math.max(8, Math.ceil(requeridos * 0.25))
    const capacidadSimilarObjetivo = Math.max(15, Math.ceil(requeridos / 5) * 5)

    if (requeridos > 0 && busesAsc.length > 0) {
      // 1. ¿Un solo bus cubre los requeridos con capacidad similar (sin exceso grande)?
      const singleFit = busesAsc.find((b) => Number(b.capacidad) >= requeridos)
      if (singleFit && Number(singleFit.capacidad) - requeridos <= margenMaximoExceso) {
        busesRecomendados = [singleFit]
        tipoSeleccion = 'UN_BUS_OPTIMO'
      } else if (singleFit) {
        // Todos los buses disponibles son muy grandes para lo requerido (ej. 50+ para 35)
        busesRecomendados = []
        tipoSeleccion = 'FLOTA_SOBREDIMENSIONADA'
      } else if (asientosDisponibles >= requeridos) {
        // 2. Combinación óptima (greedy + ajuste de último bus para minimizar exceso)
        let sum = 0
        const picked = []
        const remaining = [...busesDesc]
        while (sum < requeridos && remaining.length > 0) {
          const faltante = requeridos - sum
          // Si alguno de los restantes cubre exacto/cerca el faltante, tomar el menor que lo cubra
          const fitLast = [...remaining]
            .reverse()
            .find((b) => Number(b.capacidad) >= faltante)
          const chosen = fitLast || remaining[0]
          picked.push(chosen)
          sum += Number(chosen.capacidad)
          const idx = remaining.findIndex((b) => b.bus_id === chosen.bus_id)
          remaining.splice(idx, 1)
        }
        busesRecomendados = picked
        tipoSeleccion = 'MULTI_BUS_OPTIMO'
      } else {
        busesRecomendados = busesDesc
        tipoSeleccion = 'FLOTA_INSUFICIENTE'
      }
    }

    const asientosOptimos =
      busesRecomendados.length > 0
        ? busesRecomendados.reduce((sum, b) => sum + Number(b.capacidad || 0), 0)
        : capacidadSimilarObjetivo
    const asientosDesperdiciados = Math.max(0, asientosOptimos - requeridos)
    const ocupacionOptimaPct =
      asientosOptimos > 0
        ? Math.min(100, Math.round((requeridos / asientosOptimos) * 100))
        : 0
    const costoOptimo = Number((asientosOptimos * costoPorAsiento).toFixed(2))

    // Alternativa sobredimensionada (si se eligiera el bus más grande en vez del óptimo)
    const busMasGrande = busesDesc[0] || null
    const asientosSobredimensionados =
      busMasGrande && Number(busMasGrande.capacidad) > asientosOptimos
        ? Number(busMasGrande.capacidad)
        : asientosOptimos + 15
    const costoSobredimensionado = Number(
      (asientosSobredimensionados * costoPorAsiento).toFixed(2)
    )
    const ahorroEstimado = Number(
      Math.max(0, costoSobredimensionado - costoOptimo).toFixed(2)
    )
    const porcentajeAhorro =
      costoSobredimensionado > 0
        ? Math.round((ahorroEstimado / costoSobredimensionado) * 100)
        : 0

    const deficitAsientos = Math.max(0, requeridos - asientosDisponibles)
    const busExternoSugeridoCapacidad =
      deficitAsientos > 0
        ? Math.max(15, Math.ceil(deficitAsientos / 5) * 5)
        : capacidadSimilarObjetivo
    const busesExtraNecesarios =
      deficitAsientos > 0 ? Math.ceil(deficitAsientos / 40) : 0

    // Empresa recomendada para contratar más buses
    const empresaRecomendada = proveedoresRes.rows[0] || null

    const escenarios = [
      {
        id: 'optimo',
        titulo: 'Decisión Óptima (Recomendada)',
        detalle:
          busesRecomendados.length > 0
            ? busesRecomendados
                .map((b) => `${b.codigo_interno} (${b.capacidad} asientos)`)
                .join(' + ')
            : `Contratar bus de ${busExternoSugeridoCapacidad} asientos`,
        asientos: asientosOptimos || busExternoSugeridoCapacidad,
        desperdicio: asientosDesperdiciados,
        ocupacionPct: ocupacionOptimaPct,
        costoEstimado: costoOptimo,
        impacto:
          ahorroEstimado > 0
            ? `Ahorro de S/. ${ahorroEstimado.toFixed(2)} (${porcentajeAhorro}%)`
            : 'Menor costo operativo',
        recomendado: true,
      },
      {
        id: 'sobredimensionado',
        titulo: 'Si se elige un bus más grande (Sobredimensionado)',
        detalle:
          busMasGrande && Number(busMasGrande.capacidad) > asientosOptimos
            ? `${busMasGrande.codigo_interno} (${busMasGrande.capacidad} asientos)`
            : `Bus estándar de ${asientosSobredimensionados} asientos`,
        asientos: asientosSobredimensionados,
        desperdicio: Math.max(0, asientosSobredimensionados - requeridos),
        ocupacionPct:
          asientosSobredimensionados > 0
            ? Math.min(
                100,
                Math.round((requeridos / asientosSobredimensionados) * 100)
              )
            : 0,
        costoEstimado: costoSobredimensionado,
        impacto: `+S/. ${ahorroEstimado.toFixed(2)} de sobrecosto por asientos vacíos`,
        recomendado: false,
      },
      {
        id: 'externo',
        titulo: 'Si se contrata flota externa adicional',
        detalle: empresaRecomendada
          ? `${empresaRecomendada.razon_social} (${
              deficitAsientos > 0
                ? `Bus de ${busExternoSugeridoCapacidad} asientos`
                : 'Respaldo operativo'
            })`
          : 'Proveedor externo',
        asientos: deficitAsientos > 0 ? busExternoSugeridoCapacidad : requeridos,
        desperdicio:
          deficitAsientos > 0
            ? Math.max(0, busExternoSugeridoCapacidad - deficitAsientos)
            : 0,
        ocupacionPct:
          deficitAsientos > 0 && busExternoSugeridoCapacidad > 0
            ? Math.round((deficitAsientos / busExternoSugeridoCapacidad) * 100)
            : 100,
        costoEstimado: Number(
          (
            (deficitAsientos > 0 ? busExternoSugeridoCapacidad : requeridos) *
            costoPorAsiento *
            1.15
          ).toFixed(2)
        ),
        impacto:
          deficitAsientos > 0
            ? `Cubre el déficit de ${deficitAsientos} asientos (+15% tarifa externa)`
            : 'Innecesario: la flota propia disponible cubre la demanda (+15% costo extra)',
        recomendado: deficitAsientos > 0,
      },
    ]

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

    const recommendedIds = new Set(busesRecomendados.map((b) => b.bus_id))
    const busesDisponiblesOrdenados = [...busesDisponibles].sort((a, b) => {
      const aRec = recommendedIds.has(a.bus_id) ? 0 : 1
      const bRec = recommendedIds.has(b.bus_id) ? 0 : 1
      if (aRec !== bRec) return aRec - bRec

      const aFit = Number(a.capacidad) >= requeridos ? 0 : 1
      const bFit = Number(b.capacidad) >= requeridos ? 0 : 1
      if (aFit !== bFit) return aFit - bFit

      return (
        Math.abs(Number(a.capacidad) - requeridos) -
        Math.abs(Number(b.capacidad) - requeridos)
      )
    })

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
        busesDisponibles: busesDisponiblesOrdenados,
        busesRecomendados,
        informeOptimizacion: {
          tipoSeleccion,
          capacidadSimilarObjetivo,
          costoPorAsiento,
          costoOptimo,
          costoSobredimensionado,
          ahorroEstimado,
          porcentajeAhorro,
          asientosOptimos,
          asientosDesperdiciados,
          ocupacionOptimaPct,
          busExternoSugeridoCapacidad,
          escenarios,
        },
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
