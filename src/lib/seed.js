import { db, uid } from '../db/db.js'
import { STANDARD_PRODUCTS } from './format.js'

const PRODUTOS_SEEDED_KEY = 'produtosSeeded'

// Popula os produtos padrao uma unica vez por dispositivo. Usa flag no
// localStorage (mesma logica de seedGrupos) pra nao reviver produtos
// apagados de proposito caso o usuario limpe todos eles.
export async function seedStandardProducts() {
  if (localStorage.getItem(PRODUTOS_SEEDED_KEY)) return

  await db.transaction('rw', db.products, async () => {
    const count = await db.products.count()
    if (count > 0) return
    const toAdd = STANDARD_PRODUCTS.map((p) => ({
      id: uid(), name: p.name, useValue: p.useValue, createdAt: Date.now(),
    }))
    await db.products.bulkAdd(toAdd)
  })

  localStorage.setItem(PRODUTOS_SEEDED_KEY, '1')
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

const GRUPOS_SEEDED_KEY = 'gruposSeeded'

// Popula a hierarquia padrao de grupos de credito uma unica vez por
// dispositivo. Usa uma flag no localStorage em vez de so checar se a
// tabela esta vazia: se checasse so a tabela, apagar TODOS os grupos
// (ficando com 0) faria o app achar que e uma instalacao nova e
// recriar os padroes de novo. Deve rodar DEPOIS de seedStandardProducts().
export async function seedGrupos() {
  if (localStorage.getItem(GRUPOS_SEEDED_KEY)) return

  await db.transaction('rw', db.classes, db.products, async () => {
    const count = await db.classes.count()
    if (count > 0) return

    const products = await db.products.toArray()
    const idByName = new Map(products.map((p) => [p.name, p.id]))

    const creditMenorId = uid()
    const creditMaiorId = uid()

    await db.classes.bulkAdd([
      {
        id:              creditMenorId,
        name:            'Credito < Spread',
        aggregationMode: 'sum',
        children: [
          { type: 'product', refId: idByName.get('Credito Rural')      },
          { type: 'product', refId: idByName.get('Credito Imobiliario') },
        ].filter((c) => c.refId),
        createdAt: Date.now(),
      },
      {
        id:              creditMaiorId,
        name:            'Credito > Spread',
        aggregationMode: 'sum',
        children: [
          { type: 'product', refId: idByName.get('Credito Pessoal')    },
          { type: 'product', refId: idByName.get('Credito Consignado') },
        ].filter((c) => c.refId),
        createdAt: Date.now(),
      },
      {
        id:              uid(),
        name:            'Credito Total',
        aggregationMode: 'sum',
        children: [
          { type: 'classe',   refId: creditMenorId              },
          { type: 'classe',   refId: creditMaiorId              },
          { type: 'product',  refId: idByName.get('CDC')        },
        ].filter((c) => c.refId),
        createdAt: Date.now(),
      },
    ])
  })

  localStorage.setItem(GRUPOS_SEEDED_KEY, '1')
}

export async function resetAll() {
  await db.records.clear()
  await db.goals.clear()
}
