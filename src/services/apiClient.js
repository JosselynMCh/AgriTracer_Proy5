import { getStoredToken } from './authService'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export async function apiFetch(path, options = {}) {
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error('No se pudo conectar con el servidor backend.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Error al comunicarse con la API.')
  }

  return data.data !== undefined ? data.data : data
}
