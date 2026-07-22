import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { MONTHS, BR_NUM_RE } from '../lib/format.js'

const applyMask = (v) => {
  let raw = String(v ?? '').replace(/\./g, '').replace(/[^0-9,]/g, '')
  const ci = raw.indexOf(',')
  if (ci !== -1) raw = raw.slice(0, ci + 1) + raw.slice(ci + 1).replace(/,/g, '')
  const [int = '', dec] = raw.split(',')
  const fInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec !== undefined ? `${fInt},${dec}` : fInt
}
// Via evento nativo 'input' (nativeEvent.data), nao onKeyDown: varios
// teclados Android nao disparam keydown com a tecla certa pro teclado
// numerico virtual, so o input mesmo dispara de forma confiavel.
const onMaskedChange = (setter) => (e) => {
  const { value, selectionStart } = e.target
  if (e.nativeEvent?.data === '.') {
    const i = selectionStart - 1
    setter(applyMask(value.slice(0, i) + ',' + value.slice(i + 1)))
  } else {
    setter(applyMask(value))
  }
}
const fillCentsIf = (setter, condition) => (e) => {
  if (!condition) return
  const v = e.target.value.trim()
  if (v && !v.includes(',')) setter(v + ',00')
}
const parseBRNum = (v) => {
  const s = String(v ?? '').trim()
  if (!s || !BR_NUM_RE.test(s)) return 0
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
}

const modeCardStyle = (active) => ({
  flex: 1,
  padding: '12px',
  borderRadius: '10px',
  border: `1.5px solid ${active ? '#818cf8' : '#2d3748'}`,
  background: active ? 'rgba(99,102,241,0.12)' : 'var(--bg-card-deep)',
  cursor: 'pointer',
  transition: 'all 0.15s',
})

export default function ProductModal({ onClose, onSubmit, month, year, initial = null }) {
  const isEditing = !!initial
  const [name, setName] = useState(initial?.name || '')
  const [useValue, setUseValue] = useState(initial?.useValue ?? true)
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Informe o nome do produto'); return }
    setSaving(true)
    setError('')
    try {
      await onSubmit({ name: name.trim(), useValue, goalVal: parseBRNum(goal) })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-lg flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px', maxHeight: 'min(85vh, 100%)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}
      >
        {/* Cabeçalho */}
        <div className="px-5 pt-2 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: 'var(--c-brand)' }}>
                Produto
              </p>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {isEditing ? 'Editar produto' : 'Novo produto'}
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
          <div className="mt-3 h-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--c-brand), transparent)' }} />
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              className="input"
              placeholder="Ex: Seguro Empresarial"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}

            />
          </div>

          <div>
            <label className="label">Alvo principal</label>
            <div className="flex gap-3">
              <div
                style={modeCardStyle(useValue)}
                onClick={() => { setUseValue(true); setGoal('') }}
              >
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  Valor (R$)
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Meta e progresso em reais
                </div>
              </div>
              <div
                style={modeCardStyle(!useValue)}
                onClick={() => { setUseValue(false); setGoal('') }}
              >
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  Quantidade
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Meta e progresso em unidades
                </div>
              </div>
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="label">
                Meta {useValue ? '(R$)' : '(qtd)'} — {MONTHS[Number(month) - 1]}/{year} — opcional
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                placeholder={useValue ? '100.000,00' : '20'}
                value={goal}
                onChange={onMaskedChange(setGoal)}
                onBlur={fillCentsIf(setGoal, useValue)}
              />
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
          )}

          <button
            className="btn btn-brand w-full"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? (isEditing ? 'Salvando…' : 'Criando…')
              : (isEditing ? 'Salvar alterações' : '+ Criar produto')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
