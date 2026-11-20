import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../services/apiClient'
import { updateStoredUser } from '../../services/authService'
import LoadingOverlay from '../common/LoadingOverlay'

function fileToBase64Resized(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Archivo de imagen inválido.'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

const PREFS_KEY = 'agri_tracer_prefs'

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw
      ? JSON.parse(raw)
      : { language: 'Español', theme: 'Claro', emailAlerts: true }
  } catch {
    return { language: 'Español', theme: 'Claro', emailAlerts: true }
  }
}

function PasswordField({ label, placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#147a3f]"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Ocultar' : 'Mostrar'}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          {visible ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" x2="22" y1="2" y2="22" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function ConfiguracionSection({ user, onUserUpdated }) {
  const fullName = `${user?.nombres || 'Usuario'} ${user?.apellidos || ''}`.trim()
  const initials = `${user?.nombres?.[0] || 'U'}${user?.apellidos?.[0] || ''}`.toUpperCase()
  const primaryRole = user?.roles?.[0] || 'Analista'

  // Estado de edición de perfil
  const fileInputRef = useRef(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileForm, setProfileForm] = useState({
    nombres: user?.nombres || '',
    apellidos: user?.apellidos || '',
    correo: user?.correo || '',
    telefono: user?.telefono || '',
  })

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setProfileMsg(null)
    try {
      setUploadingPhoto(true)
      const base64 = await fileToBase64Resized(file)
      const updatedUser = await apiFetch('/api/auth/photo', {
        method: 'PUT',
        body: JSON.stringify({ foto_base64: base64 }),
      })
      updateStoredUser(updatedUser)
      onUserUpdated?.(updatedUser)
      setProfileMsg({
        type: 'success',
        text: 'Foto de perfil guardada en Neon correctamente.',
      })
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.message || 'No se pudo subir la foto.',
      })
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Estado de contraseña
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMessage, setPassMessage] = useState(null)
  const [updatingPass, setUpdatingPass] = useState(false)

  // Preferencias del sistema
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [prefsSaved, setPrefsSaved] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.theme === 'Oscuro')
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  const updatePref = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setPrefsSaved(true)
    setTimeout(() => setPrefsSaved(false), 2000)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg(null)
    try {
      setSavingProfile(true)
      const updatedUser = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      })
      updateStoredUser(updatedUser)
      onUserUpdated?.(updatedUser)
      setEditingProfile(false)
      setProfileMsg({
        type: 'success',
        text: 'Perfil actualizado correctamente en Neon.',
      })
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.message || 'No se pudo actualizar el perfil.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!currentPass || !newPass || !confirmPass) {
      setPassMessage({
        type: 'error',
        text: 'Completa todos los campos de contraseña.',
      })
      return
    }
    if (newPass.length < 8) {
      setPassMessage({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 8 caracteres.',
      })
      return
    }
    if (newPass !== confirmPass) {
      setPassMessage({
        type: 'error',
        text: 'Las contraseñas nuevas no coinciden.',
      })
      return
    }

    try {
      setUpdatingPass(true)
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      })
      setPassMessage({
        type: 'success',
        text: res.message || 'Contraseña actualizada correctamente en Neon.',
      })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      setPassMessage({
        type: 'error',
        text: err.message || 'No se pudo actualizar la contraseña.',
      })
    } finally {
      setUpdatingPass(false)
    }
  }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={uploadingPhoto || savingProfile || updatingPass} />
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-[#147a3f]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </span>
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
      </div>

      {/* Mi Perfil + Cambiar Contraseña */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Mi Perfil */}
        <div className="xl:col-span-7 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#147a3f]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5Z" />
                </svg>
              </span>
              <h2 className="text-[15px] font-bold text-gray-900">Mi Perfil</h2>
            </div>
            <span className="text-[11px] font-medium text-gray-400">
              @{user?.username}
            </span>
          </div>

          {profileMsg && (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-xs font-medium ${
                profileMsg.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              {user?.foto_base64 ? (
                <img
                  src={user.foto_base64}
                  alt={fullName}
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-50 border border-gray-200"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-[#0b3d2c] ring-4 ring-emerald-50">
                  {initials}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto de perfil"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>

            <div className="flex-1 w-full text-center sm:text-left">
              {!editingProfile ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900">{fullName}</h3>
                  <p className="text-xs text-gray-500">{primaryRole}</p>

                  <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Activo
                  </span>

                  <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-3 text-xs">
                    <div>
                      <p className="text-gray-400 font-medium">Correo institucional</p>
                      <p className="mt-0.5 font-medium text-gray-800">
                        {user?.correo || 'No registrado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium">Teléfono</p>
                      <p className="mt-0.5 font-medium text-gray-800">
                        {user?.telefono || 'No registrado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium">Rol</p>
                      <p className="mt-0.5 font-medium text-gray-800">{primaryRole}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileForm({
                        nombres: user?.nombres || '',
                        apellidos: user?.apellidos || '',
                        correo: user?.correo || '',
                        telefono: user?.telefono || '',
                      })
                      setProfileMsg(null)
                      setEditingProfile(true)
                    }}
                    className="mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-emerald-200 px-5 py-2 text-xs font-semibold text-[#15803d] transition hover:bg-emerald-50 cursor-pointer"
                  >
                    <span>✎</span>
                    <span>Editar Perfil</span>
                  </button>
                </>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-3 text-left text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-gray-600">
                        Nombres
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.nombres}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, nombres: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#147a3f]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-gray-600">
                        Apellidos
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.apellidos}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, apellidos: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#147a3f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-gray-600">
                      Correo institucional
                    </label>
                    <input
                      type="email"
                      value={profileForm.correo}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, correo: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#147a3f]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-gray-600">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={profileForm.telefono}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, telefono: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#147a3f]"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="rounded-lg border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-lg bg-[#147a3f] px-4 py-2 font-semibold text-white hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
                    >
                      {savingProfile ? 'Guardando...' : 'Guardar en BD'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Cambiar Contraseña */}
        <div className="xl:col-span-5 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[#147a3f]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" />
              </svg>
            </span>
            <h2 className="text-[15px] font-bold text-gray-900">
              Cambiar Contraseña
            </h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            {passMessage && (
              <div
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  passMessage.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {passMessage.text}
              </div>
            )}

            <PasswordField
              label="Contraseña actual"
              placeholder="Ingresa tu contraseña actual"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
            />

            <PasswordField
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />

            <PasswordField
              label="Confirmar contraseña"
              placeholder="Confirma tu nueva contraseña"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />

            <button
              type="submit"
              disabled={updatingPass}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#147a3f] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f6132] disabled:opacity-60 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" />
              </svg>
              <span>{updatingPass ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Preferencias del Sistema */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#147a3f]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="4" x2="20" y1="7" y2="7" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="17" y2="17" />
                <circle cx="8" cy="7" r="2" fill="currentColor" />
                <circle cx="16" cy="12" r="2" fill="currentColor" />
                <circle cx="10" cy="17" r="2" fill="currentColor" />
              </svg>
            </span>
            <h2 className="text-[15px] font-bold text-gray-900">
              Preferencias del Sistema
            </h2>
          </div>

          {prefsSaved && (
            <span className="text-xs font-semibold text-emerald-600">
              ✓ Preferencia guardada
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Idioma
              </label>
              <select
                value={prefs.language}
                onChange={(e) => updatePref('language', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 outline-none focus:border-[#147a3f]"
              >
                <option value="Español">🌐 Español</option>
                <option value="English">🌐 English</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Tema
              </label>
              <select
                value={prefs.theme}
                onChange={(e) => updatePref('theme', e.target.value)}
                aria-label="Tema"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 outline-none focus:border-[#147a3f]"
              >
                <option value="Claro">☀ Claro</option>
                <option value="Oscuro">🌙 Oscuro</option>
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-semibold text-gray-700">
              Notificaciones por correo
            </p>
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={prefs.emailAlerts}
                onClick={() => updatePref('emailAlerts', !prefs.emailAlerts)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition cursor-pointer ${
                  prefs.emailAlerts ? 'bg-[#147a3f]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition ${
                    prefs.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Recibir alertas importantes
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
