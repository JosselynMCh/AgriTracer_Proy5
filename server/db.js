import pg from 'pg'
import { env } from './config/env.js'

const { Pool } = pg

// Evita el warning de pg-connection-string sobre sslmode=require
const normalizedUrl = env.databaseUrl.includes('sslmode=require') &&
  !env.databaseUrl.includes('uselibpqcompat=')
  ? env.databaseUrl.replace('sslmode=require', 'uselibpqcompat=true&sslmode=require')
  : env.databaseUrl

const pool = new Pool({
  connectionString: normalizedUrl,
  ssl: {
    rejectUnauthorized: false,
  },
})

export default pool
