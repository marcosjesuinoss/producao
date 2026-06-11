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
  // &id = chave primaria unica; demais campos sao indices secundarios
  records: '&id, date, year, month, product, account, manager, synced',
  goals: '&id, year, month, product, manager',
  users: '&id, name'
})

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2))
