import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { seedStandardProducts, seedGrupos } from './lib/seed.js'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomePage from './pages/HomePage.jsx'
import RecordsPage from './pages/RecordsPage.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import GruposPage from './pages/GruposPage.jsx'
import AcumuladoPage from './pages/AcumuladoPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { RecordModalProvider } from './context/RecordModalContext.jsx'
import { MonthProvider } from './context/MonthContext.jsx'
import UpdateToast from './components/UpdateToast.jsx'

export default function App() {
  const { hasPin, unlocked } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => { seedStandardProducts().then(seedGrupos) }, [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (hasPin && !unlocked) return <LoginPage />

  return (
    <MonthProvider>
    <RecordModalProvider>
      <div className="min-h-screen">
        <ScrollToTop />
        <Header online={online} />
        <main className="max-w-5xl mx-auto p-4 pb-24">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/registros" element={<RecordsPage />} />
            <Route path="/metas" element={<GoalsPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="/grupos" element={<GruposPage />} />
            <Route path="/acumulado" element={<AcumuladoPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
      <UpdateToast />
    </RecordModalProvider>
    </MonthProvider>
  )
}
