import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import GraficosSettingsFields from './GraficosSettingsFields.jsx'

// Atalho pras mesmas configuracoes do bloco "Gráficos" em Ajustes, sem
// precisar sair da tela de Evolução. Controlado pelo chamador (ver
// GraficosSettingsFields) — na Evolução isso faz o grafico ja em tela
// reagir na hora ao toggle.
export default function GraficosSettingsModal({ projecaoEnabled, marcador90Enabled, onProjecaoChange, onMarcador90Change, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-md flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px', maxHeight: 'min(85vh, 100%)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        <div className="px-5 pt-2 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--c-brand)' }}>
                Ajuste de gráficos
              </p>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Gráficos
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--bg-card-deep)', color: 'var(--text-muted)' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="mt-3 h-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--c-brand), transparent)' }}
          />
        </div>

        <div className="overflow-y-auto px-5 pb-6 space-y-3">
          <GraficosSettingsFields
            projecaoEnabled={projecaoEnabled}
            marcador90Enabled={marcador90Enabled}
            onProjecaoChange={onProjecaoChange}
            onMarcador90Change={onMarcador90Change}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
