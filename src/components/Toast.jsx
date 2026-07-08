// Toast flutuante no rodapé, acima da navegação inferior. kind='error' fica
// vermelho; qualquer outra coisa (padrão 'success') fica verde.
export default function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.kind === 'error'

  return (
    <div
      className="fixed left-4 right-4 z-50 flex justify-center"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 12px)', pointerEvents: 'none' }}
    >
      <div
        role="status"
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg"
        style={{
          background: isError ? 'var(--accent-red)' : 'var(--c-good)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          maxWidth: '100%',
          textAlign: 'center',
        }}
      >
        {isError ? '⚠' : '✓'} {toast.message}
      </div>
    </div>
  )
}
