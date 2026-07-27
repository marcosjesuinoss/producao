import Dexie from 'dexie'

/*
  IndexedDB via Dexie.
  Tabelas:
   - records: producoes
   - goals:   metas mensais por produto/gerente
   - users:   usuario local (PIN, prefs)
  Os indices ajudam os filtros (mes/ano/produto/conta).
*/
export const db = new Dexie('controle_producao')

db.version(1).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name'
})

// v2: tabela de produtos customizados (nome + tipo de metrica)
db.version(2).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name'
})

// v3: tabela de classes (agrupamentos hierarquicos de produtos/classes)
// children e aggregationMode sao armazenados como JSON no objeto
db.version(3).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name',
  classes: '&id, name'
})

// v4: snapshots da estrutura de grupos por ano (para preservar historico)
db.version(4).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name',
  classes: '&id, name',
  yearSnapshots: '&id, year'
})

// v5: remove produtos duplicados causados por race condition no seed (StrictMode dev)
db.version(5).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name',
  classes: '&id, name',
  yearSnapshots: '&id, year'
}).upgrade(async (tx) => {
  const all = await tx.table('products').toArray()
  const seen = new Set()
  const toDelete = []
  for (const p of all) {
    if (seen.has(p.name)) {
      toDelete.push(p.id)
    } else {
      seen.add(p.name)
    }
  }
  if (toDelete.length) await tx.table('products').bulkDelete(toDelete)
})

// v6: adiciona "Aplicação CDB" (se o usuario ainda nao tiver) e renomeia os
// produtos de cobranca pros nomes novos. Renomeia SO se o nome antigo
// ainda existir; se o usuario ja tiver renomeado esse produto por conta
// propria (ou nunca tiver tido esse produto no device), cria o produto com
// o nome novo direto em vez de mexer no que ja existe — nunca duplica
// (sempre checa se o nome novo ja esta la antes de qualquer coisa).
db.version(6).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name',
  classes: '&id, name',
  yearSnapshots: '&id, year'
}).upgrade(async (tx) => {
  const table = tx.table('products')
  const byName = new Map((await table.toArray()).map((p) => [p.name, p]))

  const addIfMissing = async (name, useValue) => {
    if (byName.has(name)) return
    const p = { id: uid(), name, useValue, createdAt: Date.now() }
    await table.add(p)
    byName.set(name, p)
  }

  const renameOrCreate = async (oldName, newName, useValue) => {
    if (byName.has(newName)) return
    const old = byName.get(oldName)
    if (old) {
      await table.update(old.id, { name: newName })
      byName.delete(oldName)
      byName.set(newName, { ...old, name: newName })
    } else {
      await addIfMissing(newName, useValue)
    }
  }

  await addIfMissing('Aplicação CDB', true)
  await renameOrCreate('Cobranca - Mora', 'Vencidos até 59 dias', true)
  await renameOrCreate('Cobranca - CA', 'Vencidos acima de 59 dias', true)
  await renameOrCreate('Cobranca - LP', 'Vencidos - LP', true)
})

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2))
