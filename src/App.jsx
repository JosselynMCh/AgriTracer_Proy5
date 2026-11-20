import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { clearSession, getStoredUser } from './services/authService'

function App() {
  const [user, setUser] = useState(() => getStoredUser())

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('agri_tracer_prefs') || '{}')
      document.documentElement.classList.toggle('dark', prefs.theme === 'Oscuro')
    } catch {
      // Ignorar si no hay preferencias válidas
    }
  }, [])

  const handleLogout = () => {
    clearSession()
    setUser(null)
  }

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />
  }

  return (
    <DashboardPage
      user={user}
      onUserUpdated={setUser}
      onLogout={handleLogout}
    />
  )
}

export default App
