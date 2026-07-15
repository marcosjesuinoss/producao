import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { ArrowLeft, FolderTree, Pencil, Trash2 } from 'lucide-react'
import { db } from '../db/db.js'
import { deriveMemberships } from '../utils/grupoCalculations.js'
import { deleteGrupo } from '../api/localApi.js'
import GrupoModal from '../components/GrupoModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../hooks/useToast.js'

export default function GruposPage() {
  const navigate = useNavigate()
  const [modalState, setModalState] = useState(null) // null | { editing: null | grupoObj }
  const [deleteTarget, setDeleteTarget] = useState(null) // grupo pendente de exclusao
  const { toast, showToast } = useToast()

  const allGrupos   = useLiveQuery(() => db.classes.toArray(), [], [])
  const allProducts = useLiveQuery(() => db.products.toArray(), [], [])

  const memberships = useMemo(() => deriveMemberships(allGrupos ?? []), [allGrupos])

  // Grupos that appear as children in some other grupo
  const childGrupoIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'classe').map((m) => m.childId)),
    [memberships]
  )

  // Top-level grupos: not a child of any other grupo
  const rootGrupos = useMemo(
    () => (allGrupos ?? []).filter((g) => !childGrupoIds.has(g.id)),
    [allGrupos, childGrupoIds]
  )

  // parentCount(type, id) → how many grupos this item belongs to
  const parentCount = useMemo(() => {
    const map = new Map()
    for (const m of memberships) {
      const k = `${m.childType}:${m.childId}`
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return (type, id) => map.get(`${type}:${id}`) ?? 0
  }, [memberships])

  const productById = useMemo(
    () => new Map((allProducts ?? []).map((p) => [p.id, p])),
    [allProducts]
  )

  const handleDelete = (grp) => setDeleteTarget(grp)

  const handleDeleteConfirm = async () => {
    try {
      await deleteGrupo(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      showToast(`Erro ao excluir: ${err?.message || err}`, 'error')
    }
  }

  if (!allGrupos || !allProducts) return null

  return (
    <section className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          className="btn px-2 py-2 shrink-0"
          onClick={() => navigate('/ajustes')}
          aria-label="Voltar para Ajustes"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>
            Gerenciar Grupos
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Crie e organize como suas metas se agrupam
          </p>
        </div>
      </div>

      {/* Primary action */}
      <button
        className="btn btn-brand w-full"
        onClick={() => setModalState({ editing: null })}
      >
        + Novo grupo
      </button>

      {/* Tree */}
      {rootGrupos.length === 0 ? (
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Nenhum grupo criado ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {rootGrupos.map((grp) => (
            <GrupoCard
              key={grp.id}
              grp={grp}
              allGrupos={allGrupos}
              productById={productById}
              parentCount={parentCount}
              depth={0}
              onEdit={(g) => setModalState({ editing: g })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalState && (
        <GrupoModal
          editing={modalState.editing}
          allGrupos={allGrupos}
          allProducts={allProducts}
          memberships={memberships}
          onClose={() => setModalState(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir grupo"
          description={`Excluir "${deleteTarget.name}"? Os itens dentro dele ficarão sem grupo.`}
          confirmLabel="Excluir"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Toast toast={toast} />
    </section>
  )
}

// Badge shown when an item belongs to more than one parent grupo
function GroupsBadge({ count }) {
  if (count <= 1) return null
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 600,
      background: 'rgba(99,102,241,0.15)',
      color: '#818cf8',
      borderRadius: '99px',
      padding: '2px 6px',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {count} grupos
    </span>
  )
}

function GrupoCard({ grp, allGrupos, productById, parentCount, depth, onEdit, onDelete }) {
  const labelSize   = depth === 0 ? '14px' : depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 0 ? 600 : 500

  const inner = (
    <div className="space-y-2">
      {/* Grupo header row */}
      <div className="flex items-center gap-2 min-w-0">
        <FolderTree size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
        <span
          className="flex-1 min-w-0 truncate"
          style={{ fontSize: labelSize, fontWeight: labelWeight, color: 'var(--text-secondary)' }}
        >
          {grp.name}
        </span>
        <GroupsBadge count={parentCount('classe', grp.id)} />
        <button
          className="btn px-2 py-1.5 shrink-0"
          onClick={() => onEdit(grp)}
          aria-label={`Editar ${grp.name}`}
        >
          <Pencil size={13} />
        </button>
        <button
          className="btn px-2 py-1.5 shrink-0"
          onClick={() => onDelete(grp)}
          aria-label={`Excluir ${grp.name}`}
          style={{ color: 'var(--accent-red)' }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Children */}
      {(grp.children ?? []).length > 0 && (
        <div
          className="space-y-1.5"
          style={{ borderLeft: '2px solid rgba(99,102,241,0.25)', paddingLeft: '10px', marginLeft: '6px' }}
        >
          {(grp.children ?? []).map((child) => {
            if (child.type === 'classe') {
              const childGrp = allGrupos.find((g) => g.id === child.refId)
              if (!childGrp) return null
              return (
                <GrupoCard
                  key={child.refId}
                  grp={childGrp}
                  allGrupos={allGrupos}
                  productById={productById}
                  parentCount={parentCount}
                  depth={depth + 1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              )
            }

            // Product leaf
            const prod = productById.get(child.refId)
            const pCount = parentCount('product', child.refId)
            return (
              <div key={child.refId} className="flex items-center gap-2 min-w-0">
                <span style={{
                  width: '5px', height: '5px', borderRadius: '99px',
                  background: 'var(--text-faint)', flexShrink: 0,
                }} />
                <span className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text-muted)' }}>
                  {prod?.name ?? '(produto removido)'}
                </span>
                <GroupsBadge count={pCount} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // Root level: wrapped in a card
  if (depth === 0) return <div className="card">{inner}</div>

  // Nested: no card, just content
  return <div>{inner}</div>
}
