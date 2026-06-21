import { db, uid } from '../db/db.js'
import { STANDARD_PRODUCTS } from './format.js'

// Garante que todos os produtos padrão existam no DB (idempotente).
// Wrapped in a transaction so concurrent calls (React StrictMode) don't duplicate rows.
export async function seedStandardProducts() {
  await db.transaction('rw', db.products, async () => {
    const existing = new Set((await db.products.toArray()).map((p) => p.name))
    const toAdd = STANDARD_PRODUCTS
      .filter((p) => !existing.has(p.name))
      .map((p) => ({ id: uid(), name: p.name, useValue: p.useValue, createdAt: Date.now() }))
    if (toAdd.length > 0) await db.products.bulkAdd(toAdd)
  })
}

/*
  Dados de teste. Popula records + goals para o ano corrente,
  cobrindo varios meses e produtos. Idempotente: so roda 1x.
*/
export async function seedIfEmpty() {
  const count = await db.records.count()
  if (count > 0) return false

  const y = new Date().getFullYear()
  const manager = 'Marco Silva'
  const account = 'AG 0234 / GER 17'
  const products = ['Abertura de Conta', 'Seguro de Vida - Unico', 'Consorcio', 'Cartao de Credito', 'Previdencia - Unica', 'Credito Pessoal']

  const records = []
  const pad = (n) => String(n).padStart(2, '0')

  // gera producoes do mes 1 ate o mes atual
  const curMonth = new Date().getMonth() + 1
  for (let m = 1; m <= curMonth; m++) {
    for (const product of products) {
      const n = 2 + Math.floor(Math.random() * 6) // 2..7 lancamentos
      for (let i = 0; i < n; i++) {
        const day = 1 + Math.floor(Math.random() * 27)
        records.push({
          id: uid(),
          date: `${y}-${pad(m)}-${pad(day)}`,
          year: y,
          month: m,
          product,
          account,
          manager,
          quantity: 1 + Math.floor(Math.random() * 4),
          value: product === 'Conta Corrente' ? null : 500 + Math.floor(Math.random() * 4000),
          notes: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          synced: true
        })
      }
    }
  }
  await db.records.bulkAdd(records)

  // metas mensais por produto (mesmo alvo todos os meses)
  const targets = {
    'Abertura de Conta': 20,
    'Seguro de Vida - Unico': 12,
    Consorcio: 8,
    'Cartao de Credito': 25,
    'Previdencia - Unica': 10,
    'Credito Pessoal': 500000
  }
  const goals = []
  for (let m = 1; m <= 12; m++) {
    for (const product of products) {
      goals.push({
        id: uid(),
        year: y,
        month: m,
        product,
        manager,
        targetQuantity: targets[product],
        targetValue: product === 'Conta Corrente' ? null : targets[product] * 1500,
        updatedAt: Date.now()
      })
    }
  }
  await db.goals.bulkAdd(goals)
  return true
}

// Idempotently seeds the 3 credit hierarchy grupos using product UUIDs
// looked up by name. Must run AFTER seedStandardProducts().
// Wrapped in a transaction so concurrent calls (React StrictMode) don't duplicate rows.
export async function seedGrupos() {
  await db.transaction('rw', db.classes, db.products, async () => {
  const existingGrupos = await db.classes.toArray()
  const existingByName = new Map(existingGrupos.map((g) => [g.name, g]))

  if (
    existingByName.has('Credito Total') &&
    existingByName.has('Credito < Spread') &&
    existingByName.has('Credito > Spread')
  ) return

  const products = await db.products.toArray()
  const idByName = new Map(products.map((p) => [p.name, p.id]))

  // Helper: return id of an existing grupo or generate a new one
  const resolveGrupoId = (name) => existingByName.get(name)?.id ?? uid()

  const creditMenorId = resolveGrupoId('Credito < Spread')
  const creditMaiorId = resolveGrupoId('Credito > Spread')

  const toAdd = []

  if (!existingByName.has('Credito < Spread')) {
    toAdd.push({
      id:              creditMenorId,
      name:            'Credito < Spread',
      aggregationMode: 'sum',
      children: [
        { type: 'product', refId: idByName.get('Credito Rural')      },
        { type: 'product', refId: idByName.get('Credito Imobiliario') },
      ].filter((c) => c.refId),
      createdAt: Date.now(),
    })
  }

  if (!existingByName.has('Credito > Spread')) {
    toAdd.push({
      id:              creditMaiorId,
      name:            'Credito > Spread',
      aggregationMode: 'sum',
      children: [
        { type: 'product', refId: idByName.get('Credito Pessoal')    },
        { type: 'product', refId: idByName.get('Credito Consignado') },
      ].filter((c) => c.refId),
      createdAt: Date.now(),
    })
  }

  if (!existingByName.has('Credito Total')) {
    toAdd.push({
      id:              uid(),
      name:            'Credito Total',
      aggregationMode: 'sum',
      children: [
        { type: 'classe',   refId: creditMenorId              },
        { type: 'classe',   refId: creditMaiorId              },
        { type: 'product',  refId: idByName.get('CDC')        },
      ].filter((c) => c.refId),
      createdAt: Date.now(),
    })
  }

  if (toAdd.length > 0) await db.classes.bulkAdd(toAdd)
  }) // end transaction
}

export async function resetAll() {
  await db.records.clear()
  await db.goals.clear()
}
