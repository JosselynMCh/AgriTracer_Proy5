const TOKEN_KEY = 'agri_tracer_token'
const USER_KEY = 'agri_tracer_user'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export async function loginRequest({ username, password, rememberSession }) {
  let response
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberSession }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'No se pudo iniciar sesión.')
  }

  return data
}

export function saveSession({ token, user, rememberSession }) {
  clearSession()
  const storage = rememberSession ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function updateStoredUser(user) {
  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}
