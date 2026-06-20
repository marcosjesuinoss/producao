import { db, uid } from '../db/db.js'
import { monthlySummary, annualSummary, generalSummary } from '../lib/summaries.js'

/*
  "Endpoints" locais (Promise-based) equivalentes a uma REST API,
  porem 100% offline sobre IndexedDB.

    GET    /records              -> listRecords(filters)
    POST   /records             -> createRecord(payload)
    PUT    /records/:id         -> updateRecord(id, patch)
    DELETE /records/:id         -> deleteRecord(id)
    GET    /summary?period=...  -> getSummary(period, filters)
    GET    /goals               -> listGoals(filters)
    POST   /goals (upsert)      -> upsertGoal(payload)
    POST   /export?format=csv   -> ver lib/csv.js (exportCsv)
*/

// ---- Helpers ----
const ym = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// pt-BR: ponto = milhar (exige 3 digitos apos), virgula = decimal.
// "8.4" e invalido; "8.400" = 8000; "8,4" = 8.4. Formato errado -> 0.
const BR_NUM_RE = /^(\d{1,3}(\.\d{3})*(,\d*)?|\d+(,\d*)?)$/
const parseNum = (v) => {
  if (v === '' || v == null) return 0
  const s = String(v).trim()
  if (!BR_NUM_RE.test(s)) return 0
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
// Igual ao parseNum, mas vazio -> null (campos opcionais como valor).
const parseNumOrNull = (v) => (v === '' || v == null ? null : parseNum(v))

function applyFilters(coll, { year, month, product, account, manager }) {
  return coll.filter((r) => {
    if (year && r.year !== Number(year)) return false
    if (month && r.month !== Number(month)) return false
    if (product && r.product !== product) return false
    if (account && r.account !== account) return false
    if (manager && r.manager !== manager) return false
    return true
  })
}

// ---- RECORDS (CRUD) ----
export async function listRecords(filters = {}) {
  const all = db.records.orderBy('date').reverse()
  return applyFilters(all, filters).toArray()
}

export async function getRecord(id) {
  return db.records.get(id)
}

export async function createRecord(payload) {
  const { year, month } = ym(payload.date)
  const now = Date.now()
  const rec = {
    id: uid(),
    date: payload.date,
    year,
    month,
    product: payload.product?.trim() || 'Outros',
    account: payload.account?.trim() || '',
    manager: payload.manager?.trim() || '',
    quantity: parseNum(payload.quantity),
    value: parseNumOrNull(payload.value),
    notes: payload.notes?.trim() || '',
    qualified: !!payload.qualified,
    createdAt: now,
    updatedAt: now,
    synced: false
  }
  await db.records.add(rec)
  return rec
}

export async function updateRecord(id, patch) {
  const current = await db.records.get(id)
  if (!current) throw new Error('Registro nao encontrado')
  const next = { ...current, ...patch, updatedAt: Date.now(), synced: false }
  if (patch.date) {
    const { year, month } = ym(patch.date)
    next.year = year
    next.month = month
  }
  if ('quantity' in patch) next.quantity = parseNum(patch.quantity)
  if ('value' in patch) next.value = parseNumOrNull(patch.value)
  if ('qualified' in patch) next.qualified = !!patch.qualified
  await db.records.put(next)
  return next
}

export async function deleteRecord(id) {
  await db.records.delete(id)
  return { ok: true, id }
}

// ---- GOALS ----
export async function listGoals(filters = {}) {
  return applyFilters(db.goals.toCollection(), filters).toArray()
}

// upsert: 1 meta por (year, month, product, manager)
export async function upsertGoal(payload) {
  const existing = await db.goals
    .filter(
      (g) =>
        g.year === Number(payload.year) &&
        g.month === Number(payload.month) &&
        g.product === payload.product &&
        (g.manager || '') === (payload.manager || '')
    )
    .first()

  const base = {
    id: existing?.id || uid(),
    year: Number(payload.year),
    month: Number(payload.month),
    product: payload.product,
    manager: payload.manager || '',
    targetQuantity: Number(payload.targetQuantity) || 0,
    targetValue: payload.targetValue === '' || payload.targetValue == null ? null : Number(payload.targetValue),
    updatedAt: Date.now()
  }
  await db.goals.put(base)
  return base
}

export async function deleteGoal(id) {
  await db.goals.delete(id)
  return { ok: true, id }
}

// ---- PRODUTOS CUSTOMIZADOS ----
export async function createProduct({ name, useValue }) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Informe o nome do produto')
  const dup = await db.products.where('name').equalsIgnoreCase(trimmed).count()
  if (dup > 0) throw new Error('Produto já existe')
  const prod = { id: uid(), name: trimmed, useValue: !!useValue, createdAt: Date.now() }
  await db.products.add(prod)
  return prod
}

export async function updateProduct(id, { name, useValue }) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Informe o nome do produto')
  await db.products.update(id, { name: trimmed, useValue: !!useValue })
  return { id, name: trimmed, useValue: !!useValue }
}

export async function deleteProduct(id) {
  await db.products.delete(id)
  return { ok: true, id }
}

// ---- SUMMARY ----
export async function getSummary(period = 'monthly', filters = {}) {
  if (period === 'monthly') return monthlySummary(filters)
  if (period === 'annual') return annualSummary(filters)
  return generalSummary(filters)
}

// ---- SYNC (opcional / simples) ----
// Marca registros como sincronizados; aqui simulamos um POST em lote.
export async function syncNow(endpoint) {
  const pending = await db.records.filter((r) => !r.synced).toArray()
  if (!pending.length) return { synced: 0, skipped: 'nada pendente' }
  if (endpoint && navigator.onLine) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending)
      })
    } catch (e) {
      return { synced: 0, error: String(e) }
    }
  }
  // Em todos os casos marcamos local como sincronizado (sync otimista).
  await db.transaction('rw', db.records, async () => {
    for (const r of pending) await db.records.update(r.id, { synced: true })
  })
  return { synced: pending.length }
}
