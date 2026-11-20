CREATE TABLE roles (
    id_rol BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(250)
);

CREATE TABLE usuarios (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_usuario VARCHAR(60) NOT NULL UNIQUE,
    hash_contrasena TEXT NOT NULL, -- Guardar hash seguro, nunca contrasena en texto plano
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE,
    telefono VARCHAR(25),
    foto_base64 TEXT,
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarios_roles (
    id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_rol BIGINT NOT NULL REFERENCES roles(id_rol),
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE regiones (
    id_region BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE provincias (
    id_provincia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_region BIGINT NOT NULL REFERENCES regiones(id_region),
    nombre VARCHAR(100) NOT NULL,
    UNIQUE (id_region, nombre),
    UNIQUE (id_provincia, id_region)
);

CREATE TABLE distritos (
    id_distrito BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_provincia BIGINT NOT NULL REFERENCES provincias(id_provincia),
    nombre VARCHAR(120) NOT NULL,
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_provincia, nombre)
);

CREATE TABLE zonas (
    id_zona BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    id_usuario_lider BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (nombre)
);

CREATE TABLE zonas_distritos (
    id_zona BIGINT NOT NULL REFERENCES zonas(id_zona) ON DELETE CASCADE,
    id_distrito BIGINT NOT NULL REFERENCES distritos(id_distrito),
    PRIMARY KEY (id_zona, id_distrito)
);

-- 2. TRABAJADORES Y RENDIMIENTO HPW
CREATE TABLE trabajadores (
    id_trabajador BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'DNI',
    numero_documento VARCHAR(25) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    direccion TEXT,
    paradero_preferido VARCHAR(200),
    fecha_contratacion DATE,
    estado_trabajador VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado_trabajador IN ('ACTIVO','INACTIVO','SUSPENDIDO')),
    consentimiento_gps BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE periodos_rendimiento (
    id_periodo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    campana VARCHAR(120),
    CHECK (fecha_fin >= fecha_inicio),
    UNIQUE (nombre, fecha_inicio, fecha_fin)
);

CREATE TABLE rendimiento_trabajadores (
    performance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_periodo BIGINT NOT NULL REFERENCES periodos_rendimiento(id_periodo),
    dias_trabajados NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (dias_trabajados >= 0),
    puntaje_productividad NUMERIC(6,2) CHECK (puntaje_productividad BETWEEN 0 AND 100),
    porcentaje_asistencia NUMERIC(6,2) CHECK (porcentaje_asistencia BETWEEN 0 AND 100),
    puntaje_calidad NUMERIC(6,2) CHECK (puntaje_calidad BETWEEN 0 AND 100),
    puntaje_hpw NUMERIC(6,2) CHECK (puntaje_hpw BETWEEN 0 AND 100),
    clasificacion_hpw VARCHAR(20) NOT NULL DEFAULT 'NO_CLASIFICADO'
        CHECK (clasificacion_hpw IN ('HPW','NO_HPW','NO_CLASIFICADO')),
    fecha_evaluacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notas_fuente TEXT,
    UNIQUE (id_trabajador, id_periodo)
);

-- 3. CONVOCATORIAS Y RESULTADOS DEL ALGORITMO
CREATE TABLE convocatorias (
    id_convocatoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    campana VARCHAR(120),
    fecha_trabajo DATE NOT NULL,
    turno VARCHAR(30) NOT NULL CHECK (turno IN ('MANANA','TARDE','NOCHE','COMPLETO')),
    id_zona BIGINT REFERENCES zonas(id_zona),
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    trabajadores_requeridos INTEGER NOT NULL CHECK (trabajadores_requeridos > 0),
    estado VARCHAR(25) NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR','PROGRAMADA','ENVIADA','EN_PROCESO','CERRADA','CANCELADA')),
    creado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ejecuciones_algoritmo (
    id_ejecucion_algoritmo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_ejecucion VARCHAR(30) NOT NULL
        CHECK (tipo_ejecucion IN ('SELECCION_HPW','OPTIMIZACION_RUTAS','PREDICCION')),
    id_convocatoria BIGINT REFERENCES convocatorias(id_convocatoria) ON DELETE SET NULL,
    nombre_algoritmo VARCHAR(120) NOT NULL,
    version_algoritmo VARCHAR(60),
    parametros JSONB NOT NULL DEFAULT '{}'::JSONB,
    resumen_entrada JSONB NOT NULL DEFAULT '{}'::JSONB,
    resumen_salida JSONB NOT NULL DEFAULT '{}'::JSONB,
    estado_ejecucion VARCHAR(20) NOT NULL DEFAULT 'COMPLETADO'
        CHECK (estado_ejecucion IN ('PENDIENTE','EJECUTANDO','COMPLETADO','ERROR')),
    fecha_inicio_ejecucion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin_ejecucion TIMESTAMPTZ,
    ejecutado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE candidatos_convocatoria (
    id_candidato BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convocatoria BIGINT NOT NULL REFERENCES convocatorias(id_convocatoria) ON DELETE CASCADE,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador),
    id_ejecucion_algoritmo BIGINT REFERENCES ejecuciones_algoritmo(id_ejecucion_algoritmo) ON DELETE SET NULL,
    puntaje_hpw NUMERIC(6,2) CHECK (puntaje_hpw BETWEEN 0 AND 100),
    costo_transporte_estimado NUMERIC(10,2) CHECK (costo_transporte_estimado >= 0),
    distancia_km NUMERIC(10,2) CHECK (distancia_km >= 0),
    puntaje_seleccion NUMERIC(8,3),
    motivo_seleccion TEXT,
    estado_invitacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_invitacion IN ('PENDIENTE','ENVIADA','ACEPTADA','RECHAZADA','SIN_RESPUESTA')),
    fecha_invitacion TIMESTAMPTZ,
    fecha_respuesta TIMESTAMPTZ,
    estado_asistencia VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_asistencia IN ('PENDIENTE','ASISTIO','NO_ASISTIO','JUSTIFICADO')),
    UNIQUE (id_convocatoria, id_trabajador)
);

-- 4. TRANSPORTE, BUSES, RUTAS Y PARADEROS
CREATE TABLE proveedores_transporte (
    id_proveedor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social VARCHAR(160) NOT NULL,
    ruc VARCHAR(20),
    nombre_contacto VARCHAR(120),
    telefono VARCHAR(25),
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE buses (
    bus_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor BIGINT REFERENCES proveedores_transporte(id_proveedor),
    numero_placa VARCHAR(15) NOT NULL UNIQUE,
    codigo_interno VARCHAR(40) UNIQUE,
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    id_dispositivo_gps VARCHAR(100) UNIQUE,
    proveedor_gps VARCHAR(60) DEFAULT 'CERTISAT',
    estado_bus VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
        CHECK (estado_bus IN ('DISPONIBLE','ASIGNADO','EN_RUTA','MANTENIMIENTO','INACTIVO'))
);

CREATE TABLE rutas (
    id_ruta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL,
    descripcion_origen VARCHAR(250),
    descripcion_destino VARCHAR(250),
    distancia_estimada_km NUMERIC(10,2) CHECK (distancia_estimada_km >= 0),
    duracion_estimada_minutos INTEGER CHECK (duracion_estimada_minutos >= 0),
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE paraderos_ruta (
    id_paradero BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ruta BIGINT NOT NULL REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    nombre_paradero VARCHAR(160) NOT NULL,
    direccion TEXT,
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    latitud NUMERIC(10,7),
    longitud NUMERIC(10,7),
    orden_paradero INTEGER NOT NULL CHECK (orden_paradero > 0),
    hora_llegada_prevista TIME,
    UNIQUE (id_ruta, orden_paradero),
    CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
);

CREATE TABLE viajes_transporte (
    id_viaje BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convocatoria BIGINT NOT NULL REFERENCES convocatorias(id_convocatoria),
    id_ruta BIGINT NOT NULL REFERENCES rutas(id_ruta),
    bus_id BIGINT NOT NULL REFERENCES buses(bus_id),
    fecha_hora_salida TIMESTAMPTZ,
    fecha_hora_llegada_estimada TIMESTAMPTZ,
    fecha_hora_llegada_real TIMESTAMPTZ,
    pasajeros_previstos INTEGER NOT NULL DEFAULT 0 CHECK (pasajeros_previstos >= 0),
    pasajeros_reales INTEGER CHECK (pasajeros_reales >= 0),
    estado_viaje VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADO'
        CHECK (estado_viaje IN ('PROGRAMADO','EN_CAMINO','LLEGADA','CANCELADO')),
    asignado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE pasajeros_viaje (
    id_viaje BIGINT NOT NULL REFERENCES viajes_transporte(id_viaje) ON DELETE CASCADE,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador),
    id_paradero_abordaje BIGINT REFERENCES paraderos_ruta(id_paradero),
    estado_abordaje VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_abordaje IN ('PENDIENTE','ABORDO','NO_ABORDO')),
    fecha_abordaje TIMESTAMPTZ,
    PRIMARY KEY (id_viaje, id_trabajador)
);

CREATE TABLE posiciones_gps (
    id_posicion_gps BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bus_id BIGINT NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,
    id_viaje BIGINT REFERENCES viajes_transporte(id_viaje) ON DELETE SET NULL,
    latitud NUMERIC(10,7) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,7) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    velocidad_kmh NUMERIC(7,2) CHECK (velocidad_kmh >= 0),
    direccion_rumbo NUMERIC(6,2),
    fecha_registro TIMESTAMPTZ NOT NULL,
    fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COSTOS, ASISTENCIA Y KPI
CREATE TABLE costos_transporte (
    id_costo_transporte BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_viaje BIGINT NOT NULL REFERENCES viajes_transporte(id_viaje) ON DELETE CASCADE,
    tipo_costo VARCHAR(30) NOT NULL
        CHECK (tipo_costo IN ('FLETE','COMBUSTIBLE','PEAJE','OTRO')),
    importe NUMERIC(12,2) NOT NULL CHECK (importe >= 0),
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    descripcion TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE registros_asistencia (
    id_asistencia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convocatoria BIGINT NOT NULL REFERENCES convocatorias(id_convocatoria) ON DELETE CASCADE,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador),
    estado_asistencia VARCHAR(20) NOT NULL
        CHECK (estado_asistencia IN ('ASISTIO','NO_ASISTIO','JUSTIFICADO')),
    fecha_registro_entrada TIMESTAMPTZ,
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    observaciones TEXT,
    UNIQUE (id_convocatoria, id_trabajador)
);

CREATE TABLE notificaciones (
    id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_trabajador BIGINT REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    titulo VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'APP'
        CHECK (canal IN ('APP','SMS','WHATSAPP','EMAIL','SISTEMA')),
    estado_notificacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_notificacion IN ('PENDIENTE','ENVIADA','LEIDA','ERROR')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_envio TIMESTAMPTZ,
    fecha_lectura TIMESTAMPTZ,
    CHECK (id_usuario IS NOT NULL OR id_trabajador IS NOT NULL)
);

-- 6. AUDITORIA
CREATE TABLE registros_auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(80) NOT NULL,
    nombre_entidad VARCHAR(100) NOT NULL,
    id_entidad BIGINT,
    valores_anteriores JSONB,
    valores_nuevos JSONB,
    direccion_ip INET,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INDICES PARA CONSULTAS FRECUENTES
CREATE INDEX indice_workers_district ON trabajadores(id_distrito);
CREATE INDEX indice_worker_performance_period ON rendimiento_trabajadores(id_periodo, clasificacion_hpw);
CREATE INDEX indice_convocations_date_status ON convocatorias(fecha_trabajo, estado);
CREATE INDEX indice_candidates_convocation_status ON candidatos_convocatoria(id_convocatoria, estado_invitacion);
CREATE INDEX indice_candidates_worker ON candidatos_convocatoria(id_trabajador);
CREATE INDEX indice_trips_convocation ON viajes_transporte(id_convocatoria);
CREATE INDEX indice_gps_bus_recorded ON posiciones_gps(bus_id, fecha_registro DESC);
CREATE INDEX indice_gps_trip_recorded ON posiciones_gps(id_viaje, fecha_registro DESC);
CREATE INDEX indice_costs_trip ON costos_transporte(id_viaje);
CREATE INDEX indice_notifications_user_status ON notificaciones(id_usuario, estado_notificacion);
CREATE INDEX indice_audit_entity ON registros_auditoria(nombre_entidad, id_entidad, fecha_creacion DESC);

-- 8. VISTAS PARA EL DASHBOARD
CREATE OR REPLACE VIEW vista_costo_transporte_por_persona AS
SELECT
    t.id_viaje,
    t.id_convocatoria,
    t.bus_id,
    COALESCE(SUM(tc.importe), 0)::NUMERIC(12,2) AS costo_total_transporte,
    COALESCE(t.pasajeros_reales, t.pasajeros_previstos, 0) AS cantidad_pasajeros,
    CASE
        WHEN COALESCE(t.pasajeros_reales, t.pasajeros_previstos, 0) > 0
        THEN ROUND(
            COALESCE(SUM(tc.importe), 0) /
            COALESCE(t.pasajeros_reales, t.pasajeros_previstos)::NUMERIC, 2
        )
        ELSE NULL
    END AS costo_por_persona
FROM viajes_transporte t
LEFT JOIN costos_transporte tc ON tc.id_viaje = t.id_viaje
GROUP BY t.id_viaje, t.id_convocatoria, t.bus_id, t.pasajeros_reales, t.pasajeros_previstos;

CREATE OR REPLACE VIEW vista_reingreso_hpw AS
SELECT
    c.id_convocatoria,
    c.fecha_trabajo,
    c.campana,
    COUNT(*) FILTER (WHERE cp.puntaje_hpw IS NOT NULL) AS trabajadores_hpw_evaluados,
    COUNT(*) FILTER (
        WHERE cp.puntaje_hpw >= 70 AND ar.estado_asistencia = 'ASISTIO'
    ) AS trabajadores_hpw_reingresados,
    CASE
        WHEN COUNT(*) FILTER (WHERE cp.puntaje_hpw >= 70) > 0
        THEN ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE cp.puntaje_hpw >= 70 AND ar.estado_asistencia = 'ASISTIO'
            ) /
            COUNT(*) FILTER (WHERE cp.puntaje_hpw >= 70), 2
        )
        ELSE 0
    END AS porcentaje_reingreso_hpw
FROM convocatorias c
JOIN candidatos_convocatoria cp ON cp.id_convocatoria = c.id_convocatoria
LEFT JOIN registros_asistencia ar
    ON ar.id_convocatoria = c.id_convocatoria AND ar.id_trabajador = cp.id_trabajador
GROUP BY c.id_convocatoria, c.fecha_trabajo, c.campana;

CREATE OR REPLACE VIEW vista_indicadores_dashboard AS
SELECT
    (SELECT ROUND(AVG(costo_por_persona), 2)
     FROM vista_costo_transporte_por_persona
     WHERE costo_por_persona IS NOT NULL) AS costo_promedio_transporte_persona,
    (SELECT ROUND(AVG(porcentaje_reingreso_hpw), 2)
     FROM vista_reingreso_hpw) AS porcentaje_promedio_reingreso_hpw,
    (SELECT COUNT(*) FROM distritos WHERE esta_activo = TRUE) AS distritos_activos,
    (SELECT COUNT(*) FROM trabajadores WHERE estado_trabajador = 'ACTIVO') AS trabajadores_activos,
    (SELECT COUNT(*) FROM convocatorias
     WHERE fecha_trabajo >= CURRENT_DATE AND estado IN ('PROGRAMADA','ENVIADA','EN_PROCESO')
    ) AS convocatorias_proximas;

-- 9. DATOS INICIALES DE ROLES Y REGIONES
INSERT INTO roles (nombre, descripcion) VALUES
('ADMINISTRADOR', 'Acceso integral y administracion del sistema'),
('RECLUTAMIENTO', 'Gestion de trabajadores y convocatorias'),
('LIDER_ZONA', 'Gestion de convocatorias y seguimiento de su zona'),
('TRANSPORTE', 'Gestion de buses, rutas, viajes y costos'),
('ANALISTA_MO', 'Analisis de mano de obra, rendimiento y KPI'),
('GERENCIA', 'Consulta de indicadores y reportes')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO regiones (nombre) VALUES ('Lambayeque'), ('Piura')
ON CONFLICT (nombre) DO NOTHING;

-- 10. TRIGGER PARA ACTUALIZAR fecha_modificacion
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disparador_users_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER disparador_workers_updated_at
BEFORE UPDATE ON trabajadores
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER disparador_convocations_updated_at
BEFORE UPDATE ON convocatorias
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

COMMIT;


---


-- ==========================================
-- ALTER TABLE: DATOS ADICIONALES DE USUARIOS
-- ==========================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_perfil_nombre VARCHAR(255);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS fecha_actualizacion_foto TIMESTAMPTZ;

-- ==========================================
-- ALTER TABLE: PREFERENCIAS DEL SISTEMA
-- ==========================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS idioma VARCHAR(10) NOT NULL DEFAULT 'es';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS tema VARCHAR(15) NOT NULL DEFAULT 'CLARO';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS notificaciones_email BOOLEAN NOT NULL DEFAULT TRUE;

-- Preferencias individuales de notificaciones
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS preferencias_notificacion JSONB
NOT NULL DEFAULT '{
    "convocatorias_hpw": true,
    "transporte_rutas": true,
    "reportes_alertas": true,
    "notificaciones_sistema": true
}'::JSONB;

----------------------


