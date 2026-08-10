import { db, uid } from '../db/db.js'
import { STANDARD_PRODUCTS } from './format.js'
import { notifyDataChanged } from './dataBus.js'

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
  notifyDataChanged()
}
