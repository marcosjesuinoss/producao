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

// v7: tabela de ferias do gerente. Cada periodo tem inicio/fim (inclusive) e
// um "mode" que define o que acontece com a meta do mes (ver lib/ferias.js):
//   'full'    -> meta continua a mesma (o ritmo diario sobe nos dias uteis restantes)
//   'prorata' -> meta cai proporcionalmente aos dias uteis efetivamente trabalhados
db.version(7).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name',
  classes: '&id, name',
  yearSnapshots: '&id, year',
  ferias: '&id, startDate, endDate'
})

// v8: "lapides" de exclusao, preparando a sincronizacao com a nuvem.
//
// Sem isso, apagar algo aqui e so sumir com a linha — e na proxima descida
// da nuvem o item RESSUSCITA, porque o servidor nunca soube que ele foi
// apagado. A alternativa comum (marcar cada linha com "deletedAt" e filtrar
// na leitura) exigiria mexer nos 19 pontos que leem records hoje; uma tabela
// separada resolve sem tocar em nenhum deles — so quem sincroniza consulta.
//
// key = "<tabela>:<id>" pra uma lapide nunca colidir com a de outra tabela.
// synced marca as que o servidor ja recebeu (podem ser limpas depois).
db.version(8).stores({
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name',
  products: '&id, name',
  classes: '&id, name',
  yearSnapshots: '&id, year',
  ferias: '&id, startDate, endDate',
  deletions: '&key, table, deletedAt, synced'
})

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2))
