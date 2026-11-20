import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT) || 3001,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'agri_tracer_dev_secret_fallback',
}

if (!env.databaseUrl) {
  throw new Error('Falta la variable de entorno DATABASE_URL en .env')
}
