import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

/**
 * Genera un hash seguro con bcrypt para nuevas contraseñas.
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10)
}

/**
 * Verifica una contraseña contra el hash almacenado.
 * Soporta hashes bcrypt ($2a$/$2b$/$2y$) y hashes SHA-256 hex (64 caracteres).
 */
export async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false

  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compare(plainPassword, storedHash)
  }

  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const candidateHex = crypto
      .createHash('sha256')
      .update(plainPassword, 'utf8')
      .digest('hex')

    const a = Buffer.from(candidateHex, 'hex')
    const b = Buffer.from(storedHash, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }

  return false
}
