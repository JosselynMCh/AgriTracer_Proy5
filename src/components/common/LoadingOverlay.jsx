export default function LoadingOverlay({ show, message = 'Cargando datos...' }) {
  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px]"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-7 py-5 shadow-xl border border-gray-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#147a3f]" />
        <p className="text-xs sm:text-sm font-semibold text-gray-700">
          {message}
        </p>
      </div>
    </div>
  )
}
