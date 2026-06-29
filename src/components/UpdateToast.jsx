import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateToast() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed left-4 right-4 z-50 max-w-sm mx-auto" style={{ bottom: 'calc(60px + env(safe-area-inset-bottom) + 12px)' }}>
      <div
        className="card shadow-2xl p-4 flex items-center gap-3"
        style={{ borderColor: 'var(--c-brand)', borderWidth: '1.5px' }}
      >
        <div
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: 'var(--c-brand-soft)', color: 'var(--c-brand)' }}
        >
          <RefreshCw size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
            Nova versão disponível
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Toque em Atualizar para usar os recursos mais recentes.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            className="btn btn-brand text-xs px-3 py-1.5"
            onClick={() => updateServiceWorker(true)}
          >
            Atualizar
          </button>
          <button
            className="btn text-xs px-3 py-1"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setNeedRefresh(false)}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
