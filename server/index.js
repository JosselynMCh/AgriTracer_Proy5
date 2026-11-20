import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import pool from './db.js'
import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import convocatoriasRoutes from './routes/convocatoriasRoutes.js'
import rutasRoutes from './routes/rutasRoutes.js'
import busesRoutes from './routes/busesRoutes.js'
import gpsRoutes from './routes/gpsRoutes.js'
import trabajadoresRoutes from './routes/trabajadoresRoutes.js'
import reportesRoutes from './routes/reportesRoutes.js'
import prediccionRoutes from './routes/prediccionRoutes.js'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  })
)
app.use(express.json({ limit: '5mb' }))

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'API de Agri-Tracer funcionando',
    health: '/api/health',
  })
})

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time, current_database() AS database')
    res.json({
      ok: true,
      message: 'Conexión exitosa a Neon PostgreSQL',
      data: result.rows[0],
    })
  } catch (error) {
    console.error('Error al conectar con Neon:', error)
    res.status(500).json({
      ok: false,
      message: 'Error al conectar con la base de datos',
      error: error.message,
    })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/convocatorias', convocatoriasRoutes)
app.use('/api/rutas', rutasRoutes)
app.use('/api/buses', busesRoutes)
app.use('/api/gps', gpsRoutes)
app.use('/api/trabajadores', trabajadoresRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/prediccion', prediccionRoutes)

app.listen(env.port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${env.port}`)
})
