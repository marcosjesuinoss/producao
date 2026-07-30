import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2 } from 'lucide-react'

// countdown = segundos que o botao de confirmar fica bloqueado (0 = libera na hora).
// tone = 'danger' (vermelho, padrao — acoes destrutivas) | 'warning' (amarelo — so um aviso).
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmIcon: ConfirmIcon = Trash2,
  countdown = 0,
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const isWarning = tone === 'warning'
  const toneColor = isWarning ? 'var(--accent-yellow)' : 'var(--accent-red)'
  const toneBg = isWarning ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)'

  const [seconds, setSeconds] = useState(countdown)
  const [barFilled, setBarFilled] = useState(false)

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  // Uma unica transicao continua cobrindo o tempo total, disparada ao montar
  // — fica sincronizada com o relogio real, em vez de reiniciar uma animacao
  // curta a cada segundo (o que sempre deixava a barra atrasada em relacao
  // ao numero). setTimeout em vez de requestAnimationFrame: rAF so dispara
  // se o navegador estiver de fato pintando quadros (pode nunca rodar numa
  // aba em segundo plano), e o numero (via setTimeout) nao tem essa mesma
  // dependencia — as duas coisas precisam do mesmo tipo de timer pra ficar
  // em sincronia de verdade.
  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setBarFilled(true), 10)
    return () => clearTimeout(id)
  }, [countdown])

  const ready = seconds === 0
  // Se por algum motivo a transicao nao tiver disparado a tempo, garante que
  // a barra apareça cheia assim que o botao for liberado (nunca "presa" em
  // 0% com o botao ja ativo).
  const barReady = barFilled || ready

  return createPortal(
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
          <div style={{ background: toneBg, borderRadius: '10px', padding: '8px', flexShrink: 0 }}>
            <AlertTriangle size={22} style={{ color: toneColor }} />
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
                  width: barReady ? '100%' : '0%',
                  background: ready ? 'var(--accent-red)' : 'var(--accent-yellow)',
                  borderRadius: '0 99px 99px 0',
                  transition: `width ${countdown}s linear`,
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
            className={isWarning ? 'btn flex-1 flex items-center justify-center gap-1.5' : 'btn btn-danger flex-1 flex items-center justify-center gap-1.5'}
            disabled={!ready}
            onClick={onConfirm}
            style={{
              opacity: ready ? 1 : 0.35,
              cursor: ready ? 'pointer' : 'not-allowed',
              ...(isWarning
                ? { background: 'rgba(234,179,8,0.1)', color: 'var(--accent-yellow)' }
                : {}),
            }}
          >
            <ConfirmIcon size={14} />
            {ready ? confirmLabel : `Aguarde (${seconds})`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
