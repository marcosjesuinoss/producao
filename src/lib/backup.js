import { db } from '../db/db.js'

// Tabelas de dados do usuario. Preferencias de dispositivo (tema, PIN)
// ficam no localStorage e nao entram no backup de proposito.
const TABLES = ['records', 'goals', 'products', 'classes', 'yearSnapshots']

export async function exportBackup() {
  const data = {}
  for (const table of TABLES) {
    data[table] = await db[table].toArray()
  }
  const payload = {
    app: 'controle-producao',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-producao-${payload.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (!payload || typeof payload.data !== 'object') {
    throw new Error('Arquivo de backup invalido.')
  }
  return payload
}

// Restauracao total: substitui o conteudo atual das tabelas pelo do backup.
export async function importBackup(payload) {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const table of TABLES) {
      const rows = Array.isArray(payload.data[table]) ? payload.data[table] : []
      await db[table].clear()
      if (rows.length) await db[table].bulkAdd(rows)
    }
  })
}
