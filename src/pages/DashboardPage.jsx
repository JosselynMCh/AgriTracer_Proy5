import { useEffect, useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import KpiCards from '../components/dashboard/KpiCards'
import RouteCoverageMap from '../components/dashboard/RouteCoverageMap'
import RecentCallsTable from '../components/dashboard/RecentCallsTable'
import DashboardChartsAndAlerts from '../components/dashboard/DashboardChartsAndAlerts'
import ConvocatoriasSection from '../components/convocatorias/ConvocatoriasSection'
import BusesSection from '../components/buses/BusesSection'
import RutasTransporteSection from '../components/rutas/RutasTransporteSection'
import SeguimientoGpsSection from '../components/gps/SeguimientoGpsSection'
import TrabajadoresSection from '../components/trabajadores/TrabajadoresSection'
import ReportesAnaliticaSection from '../components/reportes/ReportesAnaliticaSection'
import PrediccionSection from '../components/prediccion/PrediccionSection'
import ConfiguracionSection from '../components/configuracion/ConfiguracionSection'
import AyudaSection from '../components/ayuda/AyudaSection'
import LoadingOverlay from '../components/common/LoadingOverlay'
import { apiFetch } from '../services/apiClient'

const SECTION_TITLES = {
  dashboard: 'Dashboard',
  convocatorias: 'Convocatorias HPW',
  buses: 'Buses y Asignación',
  rutas: 'Rutas y Transporte',
  gps: 'Seguimiento GPS',
  trabajadores: 'Trabajadores',
  reportes: 'Reportes y Analítica',
  prediccion: 'Predicción',
  configuracion: 'Configuración',
  ayuda: 'Ayuda',
}

export default function DashboardPage({ user, onUserUpdated, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    if (activeSection !== 'dashboard') return
    let cancelled = false

    apiFetch('/api/dashboard')
      .then((data) => {
        if (!cancelled) {
          setDashboardData(data)
          setDashboardError('')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDashboardError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeSection])

  const currentTitle = SECTION_TITLES[activeSection] || 'Dashboard'
  const isDashboardLoading =
    activeSection === 'dashboard' && !dashboardData && !dashboardError

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-[#f3f6f4] text-gray-900">
      <LoadingOverlay show={isDashboardLoading} />
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <Topbar
          title={currentTitle}
          user={user}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 lg:overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4">
          {activeSection === 'dashboard' ? (
            <>
              {dashboardError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  {dashboardError}
                </div>
              )}

              <KpiCards kpis={dashboardData?.kpis} />

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-6">
                  <RouteCoverageMap mapa={dashboardData?.mapa} />
                </div>
                <div className="xl:col-span-6">
                  <RecentCallsTable
                    rows={dashboardData?.convocatoriasRecientes || []}
                    onViewAll={() => setActiveSection('convocatorias')}
                  />
                </div>
              </section>

              <DashboardChartsAndAlerts
                reingresoSerie={dashboardData?.reingresoSerie || []}
                costosSerie={dashboardData?.costosSerie || []}
                alertas={dashboardData?.alertas || []}
              />
            </>
          ) : activeSection === 'convocatorias' ? (
            <ConvocatoriasSection />
          ) : activeSection === 'buses' ? (
            <BusesSection />
          ) : activeSection === 'rutas' ? (
            <RutasTransporteSection />
          ) : activeSection === 'gps' ? (
            <SeguimientoGpsSection />
          ) : activeSection === 'trabajadores' ? (
            <TrabajadoresSection />
          ) : activeSection === 'reportes' ? (
            <ReportesAnaliticaSection />
          ) : activeSection === 'prediccion' ? (
            <PrediccionSection />
          ) : activeSection === 'configuracion' ? (
            <ConfiguracionSection user={user} onUserUpdated={onUserUpdated} />
          ) : activeSection === 'ayuda' ? (
            <AyudaSection />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-xs">
              <h2 className="text-lg font-bold text-gray-900">{currentTitle}</h2>
              <p className="mt-1 text-sm text-gray-500">
                Esta sección se implementará en el siguiente paso.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className="mt-4 rounded-lg bg-[#0b3d2c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#093221] cursor-pointer"
              >
                Volver al Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
