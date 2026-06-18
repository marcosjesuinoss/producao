import { useEffect } from 'react'
import RecordForm from './RecordForm.jsx'

export default function RecordModal({ initial, onSubmit, onClose }) {
  // Bloqueia scroll do body enquanto o modal está aberto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Fecha ao pressionar Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isEditing = !!initial?.id

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="modal-sheet relative w-full sm:max-w-lg flex flex-col"
        style={{
          background: 'var(--c-surface)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '92dvh',
        }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--c-border)' }} />
        </div>

        {/* Cabeçalho */}
        <div className="px-5 pt-2 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: 'var(--c-brand)' }}
              >
                {isEditing ? 'Editando' : 'Novo lançamento'}
              </p>
              <h2 className="text-xl font-bold leading-tight">
                {isEditing ? 'Editar registro' : 'Novo registro'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-xl leading-none font-light"
              style={{ background: 'var(--c-border)', color: 'var(--c-muted)' }}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {/* Linha brand */}
          <div
            className="mt-3 h-0.5 rounded-full"
            style={{ background: `linear-gradient(90deg, var(--c-brand), transparent)` }}
          />
        </div>

        {/* Formulário — área rolável */}
        <div className="overflow-y-auto px-5 pb-8">
          <RecordForm
            initial={initial}
            onSubmit={onSubmit}
            onCancel={onClose}
            noCard
          />
        </div>
      </div>
    </div>
  )
}
