import { useEffect } from 'react'

// Toast flutuante no rodapé, acima da navegação inferior. Cores seguem o
// tema atual (superfície + borda), com o ícone marcando erro (vermelho) vs
// sucesso (verde) — em vez de um fundo solido vermelho/verde, que destoava
// dos 3 temas do app. Some sozinho depois de um tempo, ou na hora se o
// usuário clicar nele ou rolar a tela.
export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    // capture:true pega o scroll mesmo vindo de dentro do <main> (unico
    // elemento que realmente rola no app) — evento de scroll nao borbulha,
    // mas a fase de captura sempre passa pela window.
    window.addEventListener('scroll', onDismiss, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onDismiss, { capture: true })
  }, [toast, onDismiss])

  if (!toast) return null
  const isError = toast.kind === 'error'

  return (
    <div
      className="fixed left-4 right-4 z-50 flex justify-center"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 12px)', pointerEvents: 'none' }}
    >
      <div
        role="status"
        onClick={onDismiss}
        className="flex items-center gap-2 px-4 py-3 shadow-lg cursor-pointer"
        style={{
          background: 'var(--c-surface)',
          border: `1px solid ${isError ? 'var(--accent-red)' : 'var(--c-border)'}`,
          borderRadius: '14px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 500,
          maxWidth: '100%',
          textAlign: 'left',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ color: isError ? 'var(--accent-red)' : 'var(--c-good)', flexShrink: 0 }}>
          {isError ? '⚠' : '✓'}
        </span>
        {toast.message}
      </div>
    </div>
  )
}
