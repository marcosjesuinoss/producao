import { db, uid } from '../db/db.js'
import { notifyDataChanged } from '../lib/dataBus.js'

/*
  "Endpoints" locais (Promise-based) equivalentes a uma REST API,
  porem 100% offline sobre IndexedDB.

    POST   /records             -> createRecord(payload)
    PUT    /records/:id         -> updateRecord(id, patch)
    DELETE /records/:id         -> deleteRecord(id)
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
    clientName: payload.clientName?.trim() || '',
    createdAt: now,
    updatedAt: now,
    synced: false
  }
  await db.records.add(rec)
  notifyDataChanged()
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
  if ('ignored'   in patch) next.ignored   = !!patch.ignored
  await db.records.put(next)
  notifyDataChanged()
  return next
}

export async function deleteRecord(id) {
  await db.records.delete(id)
  notifyDataChanged()
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
  notifyDataChanged()
  return base
}

export async function deleteGoal(id) {
  await db.goals.delete(id)
  notifyDataChanged()
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
  notifyDataChanged()
  return prod
}

export async function updateProduct(id, { name, useValue }) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Informe o nome do produto')

  const current = await db.products.get(id)
  const oldName = current?.name

  await db.transaction('rw', db.products, db.records, db.goals, async () => {
    await db.products.update(id, { name: trimmed, useValue: !!useValue })

    if (oldName && oldName !== trimmed) {
      const recordIds = (await db.records.where('product').equals(oldName).toArray()).map(r => r.id)
      for (const rid of recordIds) await db.records.update(rid, { product: trimmed })

      const goalIds = (await db.goals.where('product').equals(oldName).toArray()).map(g => g.id)
      for (const gid of goalIds) await db.goals.update(gid, { product: trimmed })
    }
  })

  notifyDataChanged()
  return { id, name: trimmed, useValue: !!useValue }
}

// Produto sem nenhum lancamento: exclui de verdade (e limpa referencias
// orfas em grupos que o continham). Produto COM lancamentos: arquiva em vez
// de excluir — os dados existentes (registros, relatorios, backups)
// continuam intactos, so some das listas de uso ativo (Metas, novo
// registro). Evita tanto perder historico quanto deixar "lixo" (referencia
// a um id que nao existe mais) espalhado pelos grupos.
export async function deleteProduct(id) {
  const product = await db.products.get(id)
  if (!product) return { ok: true, id, archived: false }

  const hasRecords = (await db.records.where('product').equals(product.name).count()) > 0
  if (hasRecords) {
    await db.products.update(id, { archived: true })
    notifyDataChanged()
    return { ok: true, id, archived: true }
  }

  await db.transaction('rw', db.products, db.classes, async () => {
    await db.products.delete(id)
    const grupos = await db.classes.toArray()
    for (const g of grupos) {
      const children = g.children ?? []
      const filtered = children.filter((c) => !(c.type === 'product' && c.refId === id))
      if (filtered.length !== children.length) {
        await db.classes.update(g.id, { children: filtered })
      }
    }
  })
  notifyDataChanged()
  return { ok: true, id, archived: false }
}

export async function unarchiveProduct(id) {
  await db.products.update(id, { archived: false })
  notifyDataChanged()
  return { ok: true, id }
}

// ---- GRUPOS ----
export async function createGrupo({ name, aggregationMode, children }) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Informe o nome do grupo')
  const grp = {
    id: uid(),
    name: trimmed,
    aggregationMode: aggregationMode || 'sum',
    children: children || [],
    createdAt: Date.now(),
  }
  await db.classes.add(grp)
  notifyDataChanged()
  return grp
}

export async function updateGrupo(id, { name, aggregationMode, children }) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Informe o nome do grupo')
  await db.classes.update(id, { name: trimmed, aggregationMode, children })
  notifyDataChanged()
  return { id, name: trimmed, aggregationMode, children }
}

// Alem de excluir o grupo, limpa a referencia a ele de dentro de qualquer
// outro grupo que o tivesse como subgrupo — sem isso, sobrava um id
// apontando pra um grupo inexistente guardado pra sempre no banco (mesmo
// problema corrigido em deleteProduct).
export async function deleteGrupo(id) {
  await db.transaction('rw', db.classes, async () => {
    await db.classes.delete(id)
    const grupos = await db.classes.toArray()
    for (const g of grupos) {
      const children = g.children ?? []
      const filtered = children.filter((c) => !(c.type === 'classe' && c.refId === id))
      if (filtered.length !== children.length) {
        await db.classes.update(g.id, { children: filtered })
      }
    }
  })
  notifyDataChanged()
  return { ok: true, id }
}

// ---- YEAR SNAPSHOTS ----
export async function saveYearSnapshot(year) {
  const y      = Number(year)
  const grupos = await db.classes.toArray()
  const existing = await db.yearSnapshots.where('year').equals(y).first()
  if (existing) {
    await db.yearSnapshots.update(existing.id, { grupos, updatedAt: Date.now() })
    notifyDataChanged()
    return { id: existing.id, year: y, grupos }
  }
  const snap = { id: uid(), year: y, grupos, createdAt: Date.now() }
  await db.yearSnapshots.add(snap)
  notifyDataChanged()
  return snap
}
