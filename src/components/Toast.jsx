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
  const toneColor = isError ? 'var(--accent-red)' : 'var(--c-good)'
  // Mesmo tom suave usado nos ícones de aviso do ConfirmDialog — em vez de
  // fundo solido vermelho/verde (destoava dos temas) ou --c-surface puro
  // (ficava camuflado demais). backgroundImage por cima de backgroundColor
  // pra ficar opaco (nao deixa o conteudo por tras transparecer) mas ainda
  // tingido com a cor, em qualquer tema.
  const toneBg = isError ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)'

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
          backgroundColor: 'var(--c-surface)',
          backgroundImage: `linear-gradient(${toneBg}, ${toneBg})`,
          border: `1.5px solid ${toneColor}`,
          borderRadius: '14px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 500,
          maxWidth: '100%',
          textAlign: 'left',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ color: toneColor, flexShrink: 0 }}>
          {isError ? '⚠' : '✓'}
        </span>
        {toast.message}
      </div>
    </div>
  )
}
