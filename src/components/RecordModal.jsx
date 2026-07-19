import { useEffect } from 'react'
import { X } from 'lucide-react'
import RecordForm from './RecordForm.jsx'

export default function RecordModal({ initial, onSubmit, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isEditing = !!initial?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-lg flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px', maxHeight: '85dvh', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
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
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {isEditing ? 'Editar registro' : 'Novo registro'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
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

        <div className="overflow-y-auto px-5 pb-8">
          <RecordForm initial={initial} onSubmit={onSubmit} onCancel={onClose} noCard />
        </div>
      </div>
    </div>
  )
}
