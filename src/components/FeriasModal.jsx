import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { FERIAS_MODES, DEFAULT_FERIAS_MODE, countCalendarDays } from '../lib/ferias.js'

export default function FeriasModal({ editing, onSave, onClose }) {
  const [startDate, setStartDate] = useState(editing?.startDate ?? '')
  const [endDate, setEndDate] = useState(editing?.endDate ?? '')
  const [mode, setMode] = useState(editing?.mode ?? DEFAULT_FERIAS_MODE)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const days = startDate && endDate && endDate >= startDate
    ? countCalendarDays({ startDate, endDate })
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const err = await onSave({ startDate, endDate, mode }, editing)
    setSaving(false)
    if (err) setError(err)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <form
        onSubmit={handleSubmit}
        className="modal-sheet relative w-full sm:max-w-md flex flex-col"
        style={{
          background: 'var(--c-surface)',
          borderRadius: '24px',
          maxHeight: 'min(85vh, 100%)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div className="px-5 pt-4 pb-3 shrink-0 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Editar férias' : 'Registrar férias'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card-deep)', color: 'var(--text-muted)' }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label" htmlFor="f-inicio">Início *</label>
              <input
                id="f-inicio"
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setError(null) }}
              />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="f-fim">Fim *</label>
              <input
                id="f-fim"
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setError(null) }}
              />
            </div>
          </div>

          {days != null && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {days} {days === 1 ? 'dia' : 'dias'} de férias (contando os dois extremos).
            </p>
          )}

          <div className="space-y-2">
            <span className="label" style={{ marginBottom: 0 }}>E a meta do mês?</span>
            {Object.entries(FERIAS_MODES).map(([key, info]) => {
              const selected = mode === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={selected}
                  className="w-full text-left"
                  style={{
                    display: 'block',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: selected ? 'rgba(var(--c-brand-rgb),0.15)' : 'var(--btn-bg)',
                    boxShadow: selected ? '0 2px 8px rgba(var(--c-brand-rgb),0.25)' : 'var(--shadow-btn)',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    className="text-sm"
                    style={{ fontWeight: selected ? 700 : 500, color: selected ? 'var(--c-brand)' : 'var(--text-secondary)' }}
                  >
                    {info.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {info.description}
                  </div>
                </button>
              )
            })}
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--c-bad)' }}>{error}</p>
          )}
        </div>

        <div className="px-5 pb-5 pt-1 shrink-0 flex gap-2">
          <button type="button" className="btn flex-1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-brand flex-1" disabled={saving}>
            {editing ? 'Salvar' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
