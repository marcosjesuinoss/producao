import { db, uid } from '../db/db.js'
import { STANDARD_PRODUCTS } from './format.js'

// Garante que todos os produtos padrão existam no DB (idempotente)
export async function seedStandardProducts() {
  const existing = new Set((await db.products.toArray()).map((p) => p.name))
  const toAdd = STANDARD_PRODUCTS
    .filter((p) => !existing.has(p.name))
    .map((p) => ({ id: uid(), name: p.name, useValue: p.useValue, createdAt: Date.now() }))
  if (toAdd.length > 0) await db.products.bulkAdd(toAdd)
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

export async function resetAll() {
  await db.records.clear()
  await db.goals.clear()
}
