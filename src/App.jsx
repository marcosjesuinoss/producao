import { useEffect, useRef } from 'react'
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

// PWA instalada em standalone no iOS tem um bug conhecido do WebKit: no
// lancamento, 100dvh as vezes fica com a altura errada (nao contando a
// safe area corretamente) e so se corrige quando o WebKit recebe o
// PRIMEIRO toque/scroll da sessao — o que faz a tela "pular" bem na hora
// em que o usuario clica em algo, mesmo que o clique nao tenha nada a ver
// com o motivo do pulo. Calcular a altura via JS (window.innerHeight, que
// nao tem esse bug) e guardar numa CSS var evita depender do dvh nesses
// casos; refaz o calculo tambem apos um pequeno atraso pra pegar o
// resultado ja correto de eventuais ajustes tardios da safe area no
// lancamento, antes que o usuario chegue a tocar em algo.
function useAppHeight() {
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
    }
    setAppHeight()
    const settleTimer = setTimeout(setAppHeight, 300)
    window.addEventListener('resize', setAppHeight)
    window.addEventListener('orientationchange', setAppHeight)
    return () => {
      clearTimeout(settleTimer)
      window.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', setAppHeight)
    }
  }, [])
}

export default function App() {
  const { hasPin, unlocked } = useAuth()
  const mainRef = useRef(null)
  useAppHeight()

  useEffect(() => {
    seedStandardProducts().then(seedGrupos)
    navigator.storage?.persist?.()
  }, [])

  if (hasPin && !unlocked) return <LoginPage />

  return (
    <MonthProvider>
    <RecordModalProvider>
      {/*
        App shell: coluna flex de altura fixa (100dvh). Header e BottomNav
        ficam fora da area de rolagem — so <main> rola. O menu inferior deixa
        de depender de position:fixed (que "solta" do rodape se algum
        ancestral ganhar um novo containing block, ex.: transform/filter) e
        passa a ser so o ultimo item da coluna, sempre no rodape por
        construcao, tanto faz o que acontece no meio.
      */}
      <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--app-height, 100dvh)' }}>
        <ScrollToTop containerRef={mainRef} />
        <Header />
        <main
          ref={mainRef}
          className="max-w-5xl mx-auto p-4 w-full"
          // overflowAnchor:none desliga a compensacao automatica de scroll do
          // navegador (scroll anchoring): quando linhas novas aparecem ACIMA
          // de um botao recem-tocado (ex.: "Mostrar zerados" inserindo itens
          // zerados antes do proprio botao na lista), o WebKit tenta ajustar
          // o scrollTop sozinho pra manter o botao no lugar — e esse ajuste
          // pode brigar com a transicao FLIP que o app ja faz por conta
          // propria (ver useReorderTransition.js), causando um flash
          // instantaneo. So conteudo puramente ACRESCENTADO (sem nada
          // reordenado de verdade) nao deveria precisar de nenhuma
          // compensacao — por isso desligar essa "ajuda" do navegador aqui.
          style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overflowAnchor: 'none' }}
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
