import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { upsertGoal, createProduct, updateProduct, deleteProduct, deleteGoal } from '../api/localApi.js'
import { num, brl, BR_NUM_RE, floorPct } from '../lib/format.js'
import { useProducts } from '../hooks/useProducts.js'
import { useMonth } from '../context/MonthContext.jsx'
import { getProgressColor } from '../utils/progressColor.js'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import ProductModal from '../components/ProductModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

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
const onDotKey = (setter) => (e) => {
  if (e.key !== '.') return
  e.preventDefault()
  const { selectionStart: s, selectionEnd: en, value } = e.target
  setter(applyMask(value.slice(0, s) + ',' + value.slice(en)))
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
  const [savedToast, setSavedToast] = useState(false)
  const toastTimer = useRef(null)

  const showSaved = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setSavedToast(true)
    toastTimer.current = setTimeout(() => setSavedToast(false), 2000)
  }

  const { allProducts, custom, isValue } = useProducts()
  const productById = useMemo(() => new Map(custom.map((p) => [p.name, p.id])), [custom])

  const goals = useLiveQuery(
    () => db.goals.filter((g) => g.year === Number(year) && g.month === Number(month)).toArray(),
    [year, month], []
  )
  const done = useLiveQuery(
    () => db.records.where({ year: Number(year), month: Number(month) }).toArray(),
    [year, month], []
  )

  const realizedByProduct = useMemo(() => {
    const map = {}
    for (const r of done) {
      map[r.product] = map[r.product] || { quantity: 0, value: 0 }
      map[r.product].quantity += r.quantity || 0
      map[r.product].value += r.value || 0
    }
    return map
  }, [done])

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
      {savedToast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg"
          style={{
            transform: 'translateX(-50%)',
            background: 'var(--c-good)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          ✓ Salvo
        </div>
      )}
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
          const rec = realizedByProduct[product] || { quantity: 0, value: 0 }
          const realized = isVal ? rec.value : rec.quantity
          const target = isVal ? (g?.targetValue || 0) : (g?.targetQuantity || 0)
          const pct = target > 0 ? floorPct((realized / target) * 100) : realized > 0 ? 100 : null
          const productId = productById.get(product) ?? null
          return (
            <GoalCard
              key={`${product}-${idx}`}
              product={product}
              goal={g}
              isValueProduct={isVal}
              realized={realized}
              pct={pct}
              productId={productId}
              month={month}
              year={year}
              onSave={save}
              onSaved={showSaved}
              onDeleteGoal={g ? () => deleteGoal(g.id) : null}
              onDeleteProduct={productId && product !== 'Abertura de Conta' ? () => deleteProduct(productId) : null}
            />
          )
        })}
      </div>
    </section>
    </>
  )
}

function GoalCard({ product, goal, isValueProduct, realized, pct, productId, month, year, onSave, onSaved, onDeleteGoal, onDeleteProduct }) {
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

  const rawPctGoal = (() => {
    const t = isValueProduct ? (goal?.targetValue ?? 0) : (goal?.targetQuantity ?? 0)
    return t > 0 ? (realized / t) * 100 : realized > 0 ? 100 : 0
  })()
  const color = pct != null ? getProgressColor(rawPctGoal) : 'var(--text-faint)'

  const handleSave = () => {
    const n = parseBRNum(inputVal)
    if (isValueProduct) {
      onSave(product, 0, n || null)
    } else {
      onSave(product, n || 0, null)
    }
    onSaved?.()
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
          placeholder={isValueProduct ? '100.000,00' : 'Ex: 20'}
          value={inputVal}
          onChange={(e) => setInputVal(applyMask(e.target.value))}
          onKeyDown={onDotKey(setInputVal)}
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
          description={`Excluir produto "${product}"?`}
          confirmLabel="Excluir"
          onConfirm={() => { onDeleteProduct(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'goal' && (
        <ConfirmDialog
          title="Excluir meta"
          description={`Excluir meta de "${product}" neste período?`}
          confirmLabel="Excluir"
          onConfirm={() => { onDeleteGoal(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
