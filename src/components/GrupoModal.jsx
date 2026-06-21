import { useEffect, useMemo, useState } from 'react'
import { FolderTree, X } from 'lucide-react'
import {
  getAllAncestors,
  getAllDescendants,
  wouldCreateConflict,
  wouldExceedMaxDepth,
} from '../utils/grupoCalculations.js'
import { createGrupo, updateGrupo } from '../api/localApi.js'

// Split `${type}:${refId}` safely (UUID contains - but not :)
const splitKey = (key) => {
  const i = key.indexOf(':')
  return { type: key.slice(0, i), refId: key.slice(i + 1) }
}

function getConflictAncestorName(childType, childId, targetId, memberships, allGrupos) {
  const targetAncestors = new Set([
    targetId,
    ...getAllAncestors('classe', targetId, memberships),
  ])
  const childAncestors = getAllAncestors(childType, childId, memberships)
  const conflictId = childAncestors.find((a) => targetAncestors.has(a))
  return conflictId
    ? (allGrupos.find((g) => g.id === conflictId)?.name ?? 'outro grupo')
    : 'outro grupo'
}

function getAllDescendantIds(grupoId, allGrupos) {
  const result = new Set()
  const stack = [grupoId]
  while (stack.length) {
    const id = stack.pop()
    const grp = allGrupos.find((g) => g.id === id)
    if (!grp) continue
    for (const child of grp.children ?? []) {
      if (child.type === 'classe' && !result.has(child.refId)) {
        result.add(child.refId)
        stack.push(child.refId)
      }
    }
  }
  return result
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

export default function GrupoModal({
  editing,     // null = create, grupo object = edit
  allGrupos,
  allProducts,
  memberships,
  onClose,
}) {
  const isEditing = !!editing
  const targetId = editing?.id ?? null

  const [step, setStep] = useState(1)
  const [name, setName] = useState(editing?.name ?? '')
  const [mode, setMode] = useState(editing?.aggregationMode ?? 'sum')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-selected keys from the existing grupo being edited
  const preSelected = useMemo(() => {
    const s = new Set()
    for (const ch of editing?.children ?? []) s.add(`${ch.type}:${ch.refId}`)
    return s
  }, [editing])

  const [selected, setSelected] = useState(preSelected)

  // Grupos that are descendants of the editing grupo (excluded from list to prevent cycles)
  const descendants = useMemo(
    () => (editing ? getAllDescendantIds(editing.id, allGrupos) : new Set()),
    [editing, allGrupos]
  )

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Build the selectable item list for step 2
  const items = useMemo(() => {
    const result = []

    // Grupo refIds currently checked in this session — used for intra-selection conflict checks
    const selectedGrupoRefIds = [...selected]
      .filter((k) => k.startsWith('classe:'))
      .map((k) => k.slice(7))

    // --- Products ---
    for (const p of allProducts) {
      const key = `product:${p.id}`
      const isPreSelected = preSelected.has(key)

      let disabled = false
      let disabledReason = ''

      // Direction 1 (existing): saved-DB ancestor conflict
      if (!isPreSelected && targetId) {
        if (wouldCreateConflict('product', p.id, targetId, memberships)) {
          disabled = true
          disabledReason = `indisponível — conflito com ${getConflictAncestorName('product', p.id, targetId, memberships, allGrupos)}`
        }
      }

      // Direction 2 (new): is this product a descendant of any currently-selected grupo?
      if (!disabled && !selected.has(key)) {
        for (const sId of selectedGrupoRefIds) {
          const desc = getAllDescendants(sId, allGrupos)
          if (desc.some((d) => d.type === 'product' && d.refId === p.id)) {
            const gName = allGrupos.find((g) => g.id === sId)?.name ?? 'grupo selecionado'
            disabled = true
            disabledReason = `indisponível — já incluso em "${gName}"`
            break
          }
        }
      }

      const otherParents = memberships
        .filter((m) => m.childType === 'product' && m.childId === p.id && m.grupoId !== editing?.id)
        .map((m) => allGrupos.find((g) => g.id === m.grupoId)?.name)
        .filter(Boolean)

      const baseSubtext = 'produto'
      const alsoIn = otherParents.length > 0 ? ` · também em ${otherParents[0]}` : ''
      result.push({
        type: 'product',
        refId: p.id,
        name: p.name,
        subtext: disabled ? disabledReason : baseSubtext + alsoIn,
        disabled,
      })
    }

    // --- Grupos ---
    for (const g of allGrupos) {
      if (g.id === editing?.id) continue
      if (descendants.has(g.id)) continue

      // key uses 'classe' to match the stored child.type value in DB
      const key = `classe:${g.id}`
      const isPreSelected = preSelected.has(key)

      let disabled = false
      let disabledReason = ''

      // Direction 1 (existing): saved-DB ancestor conflict
      if (!isPreSelected && targetId) {
        if (wouldCreateConflict('classe', g.id, targetId, memberships)) {
          disabled = true
          disabledReason = `indisponível — conflito com ${getConflictAncestorName('classe', g.id, targetId, memberships, allGrupos)}`
        } else if (wouldExceedMaxDepth(g.id, targetId, allGrupos, memberships)) {
          disabled = true
          disabledReason = 'indisponível — excederia o limite de 3 níveis'
        }
      }

      if (!disabled && !selected.has(key)) {
        // Direction 2 (new): is this grupo a descendant of any currently-selected grupo?
        for (const sId of selectedGrupoRefIds) {
          const desc = getAllDescendants(sId, allGrupos)
          if (desc.some((d) => d.type === 'classe' && d.refId === g.id)) {
            const gName = allGrupos.find((gl) => gl.id === sId)?.name ?? 'grupo selecionado'
            disabled = true
            disabledReason = `indisponível — já incluso em "${gName}"`
            break
          }
        }

        // Direction 3 (new): does this grupo contain any currently-selected item?
        if (!disabled) {
          const desc = getAllDescendants(g.id, allGrupos)
          const hit = desc.find((d) => selected.has(`${d.type}:${d.refId}`))
          if (hit) {
            const hitName =
              hit.type === 'product'
                ? allProducts.find((p) => p.id === hit.refId)?.name
                : allGrupos.find((gl) => gl.id === hit.refId)?.name
            disabled = true
            disabledReason = `indisponível — contém "${hitName ?? 'item selecionado'}"`
          }
        }
      }

      const otherParents = memberships
        .filter((m) => m.childType === 'classe' && m.childId === g.id && m.grupoId !== editing?.id)
        .map((m) => allGrupos.find((gl) => gl.id === m.grupoId)?.name)
        .filter(Boolean)

      const childCount = g.children?.length ?? 0
      const baseSubtext = `grupo · ${childCount} ${childCount === 1 ? 'item' : 'itens'} dentro`
      const alsoIn = otherParents.length > 0 ? ` · também em ${otherParents[0]}` : ''
      result.push({
        type: 'classe',   // stored type value — must match DB
        refId: g.id,
        name: g.name,
        subtext: disabled ? disabledReason : baseSubtext + alsoIn,
        disabled,
      })
    }

    return result
  }, [allProducts, allGrupos, editing, preSelected, descendants, memberships, targetId, selected])

  const conflictingSelected = useMemo(
    () => items.filter((item) => item.disabled && selected.has(`${item.type}:${item.refId}`)),
    [items, selected]
  )

  const toggleItem = (key, disabled) => {
    if (disabled) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleNext = () => {
    if (!name.trim()) { setNameError('Informe o nome do grupo'); return }
    setNameError('')
    setStep(2)
  }

  const handleSave = async () => {
    const children = [...selected].map(splitKey)
    setSaving(true)
    try {
      if (isEditing) {
        await updateGrupo(editing.id, { name: name.trim(), aggregationMode: mode, children })
      } else {
        await createGrupo({ name: name.trim(), aggregationMode: mode, children })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = selected.size > 0 && conflictingSelected.length === 0 && !saving

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="modal-backdrop absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-sheet relative w-full sm:max-w-lg flex flex-col"
        style={{ background: 'var(--c-surface)', borderRadius: '24px 24px 0 0', maxHeight: '92dvh' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--input-border)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--c-brand)' }}>
                Grupo
              </p>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {step === 1 ? (isEditing ? 'Editar grupo' : 'Novo grupo') : 'Selecionar itens'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {step === 1
                  ? 'Agrupe produtos ou outros grupos para somar metas'
                  : `O que faz parte de "${name}"?`}
              </p>
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

        {/* Body */}
        <div className="overflow-y-auto px-5 pb-2 flex-1">
          {step === 1 ? (
            <div className="space-y-4 pb-2">
              <div>
                <label className="label">Nome do grupo *</label>
                <input
                  className="input"
                  placeholder="Ex: Crédito Habitacional"
                  value={name}
                  autoFocus
                  onChange={(e) => { setName(e.target.value); setNameError('') }}
                />
                {nameError && (
                  <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>{nameError}</p>
                )}
              </div>

              <div>
                <label className="label">Como calcular o progresso</label>
                <div className="flex gap-3">
                  <div style={modeCardStyle(mode === 'sum')} onClick={() => setMode('sum')}>
                    <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      Somar valores
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      R$ realizado e R$ meta somados de todos os filhos
                    </div>
                  </div>
                  <div style={modeCardStyle(mode === 'average_pct')} onClick={() => setMode('average_pct')}>
                    <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      Média de %
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      cada filho pesa igual, sem somar R$
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {/* Conflict warning (editing edge case) */}
              {conflictingSelected.length > 0 && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                }}>
                  <div className="flex items-start gap-2">
                    <span style={{ color: '#ef4444', fontSize: '16px', flexShrink: 0 }}>⚠</span>
                    <div className="space-y-1">
                      {conflictingSelected.map((item) => (
                        <p key={`${item.type}:${item.refId}`} className="text-xs" style={{ color: '#fca5a5' }}>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>{item.name}</span>
                          {' '}não pode entrar aqui — já está em um grupo que faz parte desta hierarquia.
                          Adicionar essa associação faria o valor ser contado duas vezes na mesma soma.
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Item list */}
              {items.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  Nenhum produto ou grupo disponível.
                </p>
              ) : (
                <div>
                  {items.map((item) => {
                    const key = `${item.type}:${item.refId}`
                    const isChecked = selected.has(key)
                    return (
                      <div
                        key={key}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                        style={{
                          opacity: item.disabled ? 0.4 : 1,
                          background: isChecked ? 'rgba(99,102,241,0.08)' : 'transparent',
                          cursor: item.disabled ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => toggleItem(key, item.disabled)}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 shrink-0 accent-[color:var(--c-brand)]"
                          checked={isChecked}
                          disabled={item.disabled}
                          onChange={() => {}}
                          readOnly
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {item.type === 'classe' && (
                              <FolderTree size={12} style={{ color: '#818cf8', flexShrink: 0 }} />
                            )}
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                              {item.name}
                            </span>
                          </div>
                          <div className="text-xs mt-0.5" style={{
                            color: item.disabled ? 'var(--accent-red)' : 'var(--text-muted)',
                          }}>
                            {item.subtext}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 shrink-0 border-t" style={{ borderColor: 'var(--c-border)' }}>
          {step === 1 ? (
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={onClose}>Cancelar</button>
              <button className="btn btn-brand flex-1" onClick={handleNext}>Próximo</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => setStep(1)}>Voltar</button>
              <button
                className="btn btn-brand flex-1"
                onClick={handleSave}
                disabled={!canSave}
                style={{ opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? 'auto' : 'none' }}
              >
                {saving ? 'Salvando…' : (isEditing ? 'Salvar' : 'Criar grupo')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
