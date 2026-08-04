import { useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { seedStandardProducts, seedGrupos } from './lib/seed.js'

// So <main> rola (ver o shell em App) — reseta a rolagem DELE, nao da
// janela, a cada troca de rota.
function ScrollToTop({ containerRef }) {
  const { pathname } = useLocation()
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, containerRef])
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
import EvolucaoPage from './pages/EvolucaoPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { RecordModalProvider } from './context/RecordModalContext.jsx'
import { MonthProvider } from './context/MonthContext.jsx'
import UpdateToast from './components/UpdateToast.jsx'

export default function App() {
  const { hasPin, unlocked } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)
  const mainRef = useRef(null)

  useEffect(() => {
    seedStandardProducts().then(seedGrupos)
    navigator.storage?.persist?.()
  }, [])

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
      {/*
        App shell: coluna flex de altura fixa (100dvh). Header fica fora da
        area de rolagem — so <main> rola. BottomNav e position:fixed (efeito
        de vidro fosco — precisa do conteudo rolando por tras dele), entao
        fica fora do fluxo da coluna; <main> ganha padding-bottom equivalente
        a altura do menu pra nada ficar escondido atras dele no fim da lista.
        Nenhum ancestral do menu (esta div, body) recebe transform/filter em
        lugar nenhum do app, entao o position:fixed nao corre o risco do bug
        que motivou tirar isso daqui antes (ancestral virando novo containing
        block "solta" o fixed do rodape de verdade).
      */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
        <ScrollToTop containerRef={mainRef} />
        <Header online={online} />
        <main
          ref={mainRef}
          className="max-w-5xl mx-auto p-4 w-full"
          style={{
            flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
          }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/registros" element={<RecordsPage />} />
            <Route path="/metas" element={<GoalsPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="/grupos" element={<GruposPage />} />
            <Route path="/acumulado" element={<AcumuladoPage />} />
            <Route path="/evolucao" element={<EvolucaoPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
      <UpdateToast />
    </RecordModalProvider>
    </MonthProvider>
  )
}
