import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, FolderTree, Pencil, Trash2 } from 'lucide-react'
import { db } from '../db/db.js'
import { deriveMemberships } from '../utils/classeCalculations.js'
import { deleteClasse } from '../api/localApi.js'
import ClasseModal from '../components/ClasseModal.jsx'

export default function ClassesPage() {
  const navigate = useNavigate()
  const [modalState, setModalState] = useState(null) // null | { editing: null | classeObj }

  const allClasses  = useLiveQuery(() => db.classes.toArray(), [], [])
  const allProducts = useLiveQuery(() => db.products.toArray(), [], [])

  const memberships = useMemo(() => deriveMemberships(allClasses ?? []), [allClasses])

  // Classes that appear as children in some other classe
  const childClasseIds = useMemo(
    () => new Set(memberships.filter((m) => m.childType === 'classe').map((m) => m.childId)),
    [memberships]
  )

  // Top-level classes: not a child of any other classe
  const rootClasses = useMemo(
    () => (allClasses ?? []).filter((c) => !childClasseIds.has(c.id)),
    [allClasses, childClasseIds]
  )

  // parentCount(type, id) → how many classes this item belongs to
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

  const handleDelete = (cls) => {
    if (!window.confirm(`Excluir "${cls.name}"? Os itens dentro dela ficarão sem grupo.`)) return
    deleteClasse(cls.id)
  }

  if (!allClasses || !allProducts) return null

  return (
    <section className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          className="btn px-2 py-2 shrink-0"
          onClick={() => navigate('/metas')}
          aria-label="Voltar para Metas"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>
            Gerenciar Classes
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
        + Nova classe
      </button>

      {/* Tree */}
      {rootClasses.length === 0 ? (
        <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          Nenhuma classe criada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {rootClasses.map((cls) => (
            <ClasseCard
              key={cls.id}
              cls={cls}
              allClasses={allClasses}
              productById={productById}
              parentCount={parentCount}
              depth={0}
              onEdit={(c) => setModalState({ editing: c })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalState && (
        <ClasseModal
          editing={modalState.editing}
          allClasses={allClasses}
          allProducts={allProducts}
          memberships={memberships}
          onClose={() => setModalState(null)}
        />
      )}
    </section>
  )
}

// Badge shown when an item belongs to more than one parent classe
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

function ClasseCard({ cls, allClasses, productById, parentCount, depth, onEdit, onDelete }) {
  const labelSize   = depth === 0 ? '14px' : depth === 1 ? '13px' : '12px'
  const labelWeight = depth === 0 ? 600 : 500

  const inner = (
    <div className="space-y-2">
      {/* Classe header row */}
      <div className="flex items-center gap-2 min-w-0">
        <FolderTree size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
        <span
          className="flex-1 min-w-0 truncate"
          style={{ fontSize: labelSize, fontWeight: labelWeight, color: 'var(--text-secondary)' }}
        >
          {cls.name}
        </span>
        <GroupsBadge count={parentCount('classe', cls.id)} />
        <button
          className="btn px-2 py-1.5 shrink-0"
          onClick={() => onEdit(cls)}
          aria-label={`Editar ${cls.name}`}
        >
          <Pencil size={13} />
        </button>
        <button
          className="btn px-2 py-1.5 shrink-0"
          onClick={() => onDelete(cls)}
          aria-label={`Excluir ${cls.name}`}
          style={{ color: 'var(--accent-red)' }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Children */}
      {(cls.children ?? []).length > 0 && (
        <div
          className="space-y-1.5"
          style={{ borderLeft: '2px solid rgba(99,102,241,0.25)', paddingLeft: '10px', marginLeft: '6px' }}
        >
          {(cls.children ?? []).map((child) => {
            if (child.type === 'classe') {
              const childCls = allClasses.find((c) => c.id === child.refId)
              if (!childCls) return null
              return (
                <ClasseCard
                  key={child.refId}
                  cls={childCls}
                  allClasses={allClasses}
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

  // Nested: no card, just content (parent's children container already indents)
  return <div>{inner}</div>
}
