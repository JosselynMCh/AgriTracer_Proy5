import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { env } from '../config/env.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

export async function login(req, res) {
  const { username, password, rememberSession = false } = req.body ?? {}

  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({
      ok: false,
      message: 'Debes ingresar usuario y contraseña.',
    })
  }

  try {
    const query = `
      SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.hash_contrasena,
        u.nombres,
        u.apellidos,
        u.correo,
        u.telefono,
        u.foto_base64,
        u.esta_activo,
        COALESCE(
          ARRAY_AGG(r.nombre) FILTER (WHERE r.nombre IS NOT NULL),
          '{}'
        ) AS roles
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.id_usuario = u.id_usuario
      LEFT JOIN roles r ON r.id_rol = ur.id_rol
      WHERE LOWER(u.nombre_usuario) = LOWER($1)
      GROUP BY u.id_usuario
      LIMIT 1
    `

    const { rows } = await pool.query(query, [username.trim()])
    const user = rows[0]

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario o contraseña incorrectos.',
      })
    }

    if (!user.esta_activo) {
      return res.status(403).json({
        ok: false,
        message: 'Tu cuenta está inactiva. Contacta al administrador.',
      })
    }

    const isValid = await verifyPassword(password, user.hash_contrasena)
    if (!isValid) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario o contraseña incorrectos.',
      })
    }

    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [
      user.id_usuario,
    ])

    const tokenPayload = {
      id: Number(user.id_usuario),
      username: user.nombre_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      telefono: user.telefono,
      roles: user.roles,
    }

    const token = jwt.sign(tokenPayload, env.jwtSecret, {
      expiresIn: rememberSession ? '7d' : '8h',
    })

    return res.json({
      ok: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        ...tokenPayload,
        foto_base64: user.foto_base64 || null,
      },
    })
  } catch (error) {
    console.error('Error en login:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error interno al validar las credenciales.',
    })
  }
}

export function me(req, res) {
  return res.json({
    ok: true,
    user: req.user,
  })
}

export async function updateProfile(req, res) {
  const { nombres, apellidos, correo, telefono } = req.body ?? {}

  if (!nombres?.trim() || !apellidos?.trim()) {
    return res.status(400).json({
      ok: false,
      message: 'Nombres y apellidos son obligatorios.',
    })
  }

  try {
    const { rows } = await pool.query(
      `
      UPDATE usuarios
      SET
        nombres = $1,
        apellidos = $2,
        correo = $3,
        telefono = $4
      WHERE id_usuario = $5
      RETURNING id_usuario, nombre_usuario, nombres, apellidos, correo, telefono, foto_base64
      `,
      [
        nombres.trim(),
        apellidos.trim(),
        correo?.trim() || null,
        telefono?.trim() || null,
        req.user.id,
      ]
    )

    const updated = rows[0]
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    }

    return res.json({
      ok: true,
      message: 'Perfil actualizado correctamente en Neon.',
      data: {
        id: Number(updated.id_usuario),
        username: updated.nombre_usuario,
        nombres: updated.nombres,
        apellidos: updated.apellidos,
        correo: updated.correo,
        telefono: updated.telefono,
        foto_base64: updated.foto_base64 || null,
        roles: req.user.roles || [],
      },
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        ok: false,
        message: 'Ese correo institucional ya está registrado por otro usuario.',
      })
    }
    console.error('Error en updateProfile:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar el perfil.',
    })
  }
}

export async function updateProfilePhoto(req, res) {
  const { foto_base64 } = req.body ?? {}

  if (
    typeof foto_base64 !== 'string' ||
    !foto_base64.startsWith('data:image/')
  ) {
    return res.status(400).json({
      ok: false,
      message: 'La imagen debe enviarse en formato Base64 válido.',
    })
  }

  try {
    const { rows } = await pool.query(
      `
      UPDATE usuarios
      SET foto_base64 = $1
      WHERE id_usuario = $2
      RETURNING id_usuario, nombre_usuario, nombres, apellidos, correo, telefono, foto_base64
      `,
      [foto_base64, req.user.id]
    )

    const updated = rows[0]
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    }

    return res.json({
      ok: true,
      message: 'Foto de perfil guardada en Neon.',
      data: {
        id: Number(updated.id_usuario),
        username: updated.nombre_usuario,
        nombres: updated.nombres,
        apellidos: updated.apellidos,
        correo: updated.correo,
        telefono: updated.telefono,
        foto_base64: updated.foto_base64,
        roles: req.user.roles || [],
      },
    })
  } catch (error) {
    console.error('Error en updateProfilePhoto:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al guardar la foto de perfil.',
    })
  }
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body ?? {}

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      ok: false,
      message: 'Debes ingresar tu contraseña actual y una nueva de al menos 8 caracteres.',
    })
  }

  try {
    const { rows } = await pool.query(
      'SELECT hash_contrasena FROM usuarios WHERE id_usuario = $1 LIMIT 1',
      [req.user.id]
    )
    const user = rows[0]

    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    }

    const isValid = await verifyPassword(currentPassword, user.hash_contrasena)
    if (!isValid) {
      return res.status(401).json({
        ok: false,
        message: 'La contraseña actual es incorrecta.',
      })
    }

    const newHash = await hashPassword(newPassword)
    await pool.query(
      'UPDATE usuarios SET hash_contrasena = $1 WHERE id_usuario = $2',
      [newHash, req.user.id]
    )

    return res.json({
      ok: true,
      message: 'Contraseña actualizada correctamente en la base de datos.',
    })
  } catch (error) {
    console.error('Error en changePassword:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error interno al actualizar la contraseña.',
    })
  }
}
