import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import HomePage from './pages/HomePage.jsx'
import RecordsPage from './pages/RecordsPage.jsx'
import GoalsPage from './pages/GoalsPage.jsx'
import ChartsPage from './pages/ChartsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { seedIfEmpty } from './lib/seed.js'

export default function App() {
  const { hasPin, unlocked } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    seedIfEmpty() // popula dados de teste na primeira execucao
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (hasPin && !unlocked) return <LoginPage />

  return (
    <div className="min-h-screen">
      <Header online={online} />
      <main className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/registros" element={<RecordsPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/graficos" element={<ChartsPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
