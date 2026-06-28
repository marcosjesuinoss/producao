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

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2))
