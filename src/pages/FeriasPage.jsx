import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Palmtree, Pencil, Trash2 } from 'lucide-react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { db } from '../db/db.js'
import { dateBR } from '../lib/format.js'
import {
  FERIAS_MODES, DEFAULT_FERIAS_MODE,
  createFerias, updateFerias, deleteFerias, validateFerias, countCalendarDays,
} from '../lib/ferias.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import FeriasModal from '../components/FeriasModal.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../hooks/useToast.js'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 'atual' se hoje esta dentro, 'futura' se ainda vai comecar, 'passada' se ja acabou.
function periodStatus(p) {
  const today = todayISO()
  if (today < p.startDate) return 'futura'
  if (today > p.endDate) return 'passada'
  return 'atual'
}

const STATUS_STYLE = {
  atual:   { label: 'em férias agora', color: 'var(--c-good)',     bg: 'rgba(34,197,94,0.15)' },
  futura:  { label: 'a partir de',     color: 'var(--c-brand)',    bg: 'rgba(var(--c-brand-rgb),0.15)' },
  passada: { label: 'encerrada',       color: 'var(--text-faint)', bg: 'var(--btn-bg)' },
}

export default function FeriasPage() {
  const navigate = useNavigate()
  const [modalState, setModalState] = useState(null) // null | { editing: null | feriasObj }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { toast, showToast, hideToast } = useToast()

  const all = useLiveQuery(() => db.ferias.toArray(), [], [])
  const periods = [...(all ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate))

  const handleSave = async ({ startDate, endDate, mode }, editing) => {
    const err = validateFerias({ startDate, endDate }, all ?? [], editing?.id ?? null)
    if (err) return err
    try {
      if (editing) await updateFerias(editing.id, { startDate, endDate, mode })
      else await createFerias({ startDate, endDate, mode })
      setModalState(null)
      showToast(editing ? 'Período atualizado.' : 'Férias registradas.')
      return null
    } catch (e) {
      return e?.message || 'Erro ao salvar.'
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteFerias(deleteTarget.id)
      setDeleteTarget(null)
      showToast('Período excluído.')
    } catch (e) {
      showToast(`Erro ao excluir: ${e?.message || e}`, 'error')
    }
  }

  return (
    <section className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <button className="btn px-2 py-2" onClick={() => navigate('/ajustes')} aria-label="Voltar">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Minhas férias</h2>
      </div>

      <Toast toast={toast} onDismiss={hideToast} />

      <div className="card space-y-2">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Os dias de férias deixam de contar como dias úteis nos seus gráficos.
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          A curva de esperado fica parada durante o período e o ritmo diário é recalculado
          só com os dias que você realmente trabalha.
        </p>
      </div>

      <button
        className="btn btn-brand w-full flex items-center justify-center gap-1.5"
        onClick={() => setModalState({ editing: null })}
      >
        <Plus size={16} />
        Registrar férias
      </button>

      {periods.length === 0 ? (
        <div className="card text-center py-8 space-y-2">
          <Palmtree size={28} style={{ color: 'var(--text-faint)', margin: '0 auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Nenhum período de férias registrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => {
            const status = periodStatus(p)
            const st = STATUS_STYLE[status]
            const modeInfo = FERIAS_MODES[p.mode] ?? FERIAS_MODES[DEFAULT_FERIAS_MODE]
            const days = countCalendarDays(p)
            return (
              <div key={p.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {dateBR(p.startDate)} — {dateBR(p.endDate)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {days} {days === 1 ? 'dia' : 'dias'} · {modeInfo.short}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="btn px-2 py-1.5"
                      onClick={() => setModalState({ editing: p })}
                      aria-label={`Editar período de ${dateBR(p.startDate)}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn px-2 py-1.5"
                      style={{ color: 'var(--accent-red)' }}
                      onClick={() => setDeleteTarget(p)}
                      aria-label={`Excluir período de ${dateBR(p.startDate)}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '99px',
                    background: st.bg,
                    color: st.color,
                  }}
                >
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {modalState && (
        <FeriasModal
          editing={modalState.editing}
          onSave={handleSave}
          onClose={() => setModalState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir período"
          description={`Excluir as férias de ${dateBR(deleteTarget.startDate)} a ${dateBR(deleteTarget.endDate)}?`}
          confirmLabel="Excluir"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}
