export default function Topbar({ title, user, onToggleSidebar }) {
  const initials = `${user?.nombres?.[0] || 'U'}${user?.apellidos?.[0] || ''}`.toUpperCase()
  const roleLabel = user?.roles?.[0] || 'Analista de M.O.'

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:static lg:px-6">
      <div className="flex items-center gap-2.5 text-gray-700 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 cursor-pointer lg:hidden"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        </button>

        <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3Z" />
        </svg>
        <span className="truncate text-sm font-semibold text-gray-800">{title}</span>
      </div>

      {/* Perfil de usuario */}
      <div className="flex items-center gap-2.5 shrink-0">
        {user?.foto_base64 ? (
          <img
            src={user.foto_base64}
            alt={user?.nombres || 'Usuario'}
            className="h-8 w-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b3d2c] text-xs font-bold text-white">
            {initials}
          </div>
        )}
        <div className="hidden sm:block leading-tight">
          <p className="text-xs font-semibold text-gray-800">
            {user?.nombres} {user?.apellidos}
          </p>
          <p className="text-[11px] text-gray-500">{roleLabel}</p>
        </div>
        <svg
          className="hidden sm:block h-4 w-4 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </header>
  )
}
