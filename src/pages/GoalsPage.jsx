import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useLiveQuery } from '../hooks/useLiveData.js'
import { db } from '../db/db.js'
import { upsertGoal, createProduct, updateProduct, deleteProduct, deleteGoal } from '../api/localApi.js'
import { BR_NUM_RE } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'
import { useToast } from '../hooks/useToast.js'
import { useMonth } from '../context/MonthContext.jsx'
import ProductModal from '../components/ProductModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'

const applyMask = (v) => {
  let raw = String(v ?? '').replace(/\./g, '').replace(/[^0-9,]/g, '')
  const ci = raw.indexOf(',')
  if (ci !== -1) raw = raw.slice(0, ci + 1) + raw.slice(ci + 1).replace(/,/g, '')
  const [int = '', dec] = raw.split(',')
  const fInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec !== undefined ? `${fInt},${dec}` : fInt
}
const parseBRNum = (v) => {
  const s = String(v ?? '').trim()
  if (!s || !BR_NUM_RE.test(s)) return 0
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
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

export default function GoalsPage() {
  const navigate = useNavigate()
  const { year, month } = useMonth()
  const [manager] = useState('')
  const [productModalOpen, setProductModalOpen] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const { allProducts, custom, isValue } = useProducts()
  const productById = useMemo(() => new Map(custom.map((p) => [p.name, p.id])), [custom])

  const allGrupos = useLiveQuery(() => db.classes.toArray(), [], [])
  const groupNamesByProductId = useMemo(() => {
    const map = new Map()
    for (const g of allGrupos) {
      for (const child of g.children ?? []) {
        if (child.type !== 'product') continue
        const arr = map.get(child.refId) ?? []
        arr.push(g.name)
        map.set(child.refId, arr)
      }
    }
    return map
  }, [allGrupos])

  const goals = useLiveQuery(
    () => db.goals.filter((g) => g.year === Number(year) && g.month === Number(month)).toArray(),
    [year, month], []
  )
  const goalFor = (product) => goals.find((g) => g.product === product)

  const save = async (product, targetQuantity, targetValue) => {
    await upsertGoal({ year, month, product, manager, targetQuantity, targetValue })
  }

  const handleCreateProduct = async ({ name, useValue, goalVal }) => {
    await createProduct({ name, useValue })
    if (goalVal > 0) {
      await upsertGoal({
        year, month, product: name, manager,
        targetQuantity: useValue ? 0 : goalVal,
        targetValue: useValue ? goalVal : null,
      })
    }
  }

  return (
    <>
      <Toast toast={toast} onDismiss={hideToast} />
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
            Definir Metas
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure as metas mensais por produto
          </p>
        </div>
      </div>

      <button className="btn btn-brand w-full" onClick={() => setProductModalOpen(true)}>
        + Novo produto
      </button>

      {productModalOpen && (
        <ProductModal
          month={month}
          year={year}
          onClose={() => setProductModalOpen(false)}
          onSubmit={handleCreateProduct}
        />
      )}

      <div className="space-y-3">
        {allProducts.map((product, idx) => {
          const g = goalFor(product)
          const isVal = isValue(product)
          const productId = productById.get(product) ?? null
          return (
            <GoalCard
              key={`${product}-${idx}`}
              product={product}
              goal={g}
              isValueProduct={isVal}
              productId={productId}
              month={month}
              year={year}
              onSave={save}
              showToast={showToast}
              onDeleteGoal={g ? () => deleteGoal(g.id) : null}
              onDeleteProduct={productId && product !== 'Abertura de Conta' ? () => deleteProduct(productId) : null}
              groupNames={productId ? (groupNamesByProductId.get(productId) ?? []) : []}
            />
          )
        })}
      </div>
    </section>
    </>
  )
}

function GoalCard({ product, goal, isValueProduct, productId, month, year, onSave, showToast, onDeleteGoal, onDeleteProduct, groupNames = [] }) {
  const [inputVal, setInputVal] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // null | 'product' | 'goal'

  useEffect(() => {
    const raw = isValueProduct ? (goal?.targetValue ?? '') : (goal?.targetQuantity ?? '')
    if (!raw) {
      setInputVal('')
    } else if (isValueProduct) {
      setInputVal(Number(raw).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    } else {
      setInputVal(Number(raw).toLocaleString('pt-BR', { maximumFractionDigits: 2 }))
    }
  }, [goal?.id, goal?.targetValue, goal?.targetQuantity, isValueProduct])

  const handleSave = async () => {
    const n = parseBRNum(inputVal)
    try {
      if (isValueProduct) {
        await onSave(product, 0, n || null)
      } else {
        await onSave(product, n || 0, null)
      }
      showToast('Salvo')
    } catch (err) {
      showToast(`Erro ao salvar: ${err?.message || err}`, 'error')
    }
  }

  return (
    <div className="card space-y-3">
      {/* Linha 1: nome */}
      <span className="font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{product}</span>

      {/* Linha 2: input + Salvar + ⋯ */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          placeholder={isValueProduct ? 'Ex: 100.000,00' : 'Ex: 20'}
          value={inputVal}
          onChange={onMaskedChange(setInputVal)}
          onBlur={fillCentsIf(setInputVal, isValueProduct)}
        />
        <button className="btn btn-brand text-xs px-3 py-1.5 shrink-0" onClick={handleSave}>
          Salvar
        </button>
        <div className="relative shrink-0">
            <button
              className="btn px-2.5 py-1.5"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Opções do produto"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 bottom-full mb-1 z-20 overflow-hidden shadow-lg"
                  style={{
                    background: 'var(--c-surface)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '12px',
                    minWidth: '10rem',
                  }}
                >
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => { setMenuOpen(false); setEditOpen(true) }}
                  >
                    <Pencil size={14} />
                    Editar produto
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2"
                    style={{ color: onDeleteProduct ? 'var(--accent-red)' : 'var(--text-faint)' }}
                    disabled={!onDeleteProduct}
                    onClick={() => {
                      if (!onDeleteProduct) return
                      setMenuOpen(false)
                      setConfirmAction('product')
                    }}
                  >
                    <Trash2 size={14} />
                    Excluir produto
                  </button>
                  <div style={{ height: '1px', background: 'var(--c-border)' }} />
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2"
                    style={{ color: onDeleteGoal ? 'var(--accent-red)' : 'var(--text-faint)' }}
                    disabled={!onDeleteGoal}
                    onClick={() => {
                      if (!onDeleteGoal) return
                      setMenuOpen(false)
                      setConfirmAction('goal')
                    }}
                  >
                    <Trash2 size={14} />
                    Excluir meta
                  </button>
                </div>
              </>
            )}
          </div>
      </div>

      {/* Modal de edição */}
      {editOpen && (
        <ProductModal
          initial={{ name: product, useValue: isValueProduct }}
          month={month}
          year={year}
          onClose={() => setEditOpen(false)}
          onSubmit={({ name, useValue }) => updateProduct(productId, { name, useValue })}
        />
      )}

      {confirmAction === 'product' && (
        <ConfirmDialog
          title="Excluir produto"
          description={
            groupNames.length > 0
              ? `Excluir produto "${product}"? Ele faz parte do grupo ${groupNames.map((n) => `"${n}"`).join(', ')} — o total desse grupo vai deixar de contar os registros dele.`
              : `Excluir produto "${product}"?`
          }
          confirmLabel="Excluir"
          onConfirm={async () => {
            try {
              await onDeleteProduct()
              setConfirmAction(null)
            } catch (err) {
              showToast(`Erro ao excluir: ${err?.message || err}`, 'error')
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'goal' && (
        <ConfirmDialog
          title="Excluir meta"
          description={`Excluir meta de "${product}" neste período?`}
          confirmLabel="Excluir"
          onConfirm={async () => {
            try {
              await onDeleteGoal()
              setConfirmAction(null)
            } catch (err) {
              showToast(`Erro ao excluir: ${err?.message || err}`, 'error')
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
