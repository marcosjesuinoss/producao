import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

// countdown = segundos que o botao de confirmar fica bloqueado (0 = libera na hora).
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmIcon: ConfirmIcon = Trash2,
  countdown = 0,
  onConfirm,
  onCancel,
}) {
  const [seconds, setSeconds] = useState(countdown)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  const ready = seconds === 0
  const progress = countdown > 0 ? ((countdown - seconds) / countdown) * 100 : 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm space-y-5 p-6"
        style={{ background: 'var(--c-surface)', borderRadius: '20px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        {/* Ícone + título */}
        <div className="flex items-center gap-3">
          <div style={{ background: 'rgba(239,68,68,0.12)', borderRadius: '10px', padding: '8px', flexShrink: 0 }}>
            <AlertTriangle size={22} style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
        </div>

        {/* Countdown (so quando countdown > 0) */}
        {countdown > 0 && (
          <div className="text-center space-y-2">
            {!ready ? (
              <>
                <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--accent-red)' }}>
                  {seconds}
                </span>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Aguarde para poder confirmar…</p>
              </>
            ) : (
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Pronto. Confirme para continuar.
              </p>
            )}

            <div style={{ height: '4px', width: '100%', background: 'var(--bg-bar)', borderRadius: '99px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: ready ? 'var(--accent-red)' : 'var(--accent-yellow)',
                  borderRadius: '0 99px 99px 0',
                  transition: 'width 0.9s linear',
                }}
              />
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="btn btn-danger flex-1 flex items-center justify-center gap-1.5"
            disabled={!ready}
            onClick={onConfirm}
            style={{ opacity: ready ? 1 : 0.35, cursor: ready ? 'pointer' : 'not-allowed' }}
          >
            <ConfirmIcon size={14} />
            {ready ? confirmLabel : `Aguarde (${seconds})`}
          </button>
        </div>
      </div>
    </div>
  )
}
