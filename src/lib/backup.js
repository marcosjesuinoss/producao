import { db } from '../db/db.js'
import { FULL_MONTHS } from './format.js'

// Tabelas de dados do usuario. Preferencias de dispositivo (tema, PIN)
// ficam no localStorage e nao entram no backup de proposito.
const TABLES = ['records', 'goals', 'products', 'classes', 'yearSnapshots']

// Tabelas com "data" (ano/mes) — as unicas que um periodo parcial filtra.
// Produtos/grupos/snapshots nao tem periodo, entao sempre vao inteiros.
const DATED_TABLES = new Set(['records', 'goals'])

function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// period: { type: 'tudo' } | { type: 'ano', year } | { type: 'semestre', year, semester: 1|2 } | { type: 'mes', year, month }
export function filterByPeriod(rows, period) {
  if (period.type === 'tudo') return rows
  return rows.filter((r) => {
    if (r.year !== period.year) return false
    if (period.type === 'ano') return true
    if (period.type === 'semestre') {
      return period.semester === 1 ? r.month <= 6 : r.month >= 7
    }
    return r.month === period.month
  })
}

export function describePeriod(period) {
  if (period.type === 'ano') return `o ano de ${period.year}`
  if (period.type === 'semestre') return `o ${period.semester}º semestre de ${period.year}`
  if (period.type === 'mes') return `o mês de ${FULL_MONTHS[period.month - 1]} de ${period.year}`
  return 'todos os dados'
}

export function periodSlug(period) {
  if (period.type === 'ano') return `ano-${period.year}`
  if (period.type === 'semestre') return `${period.year}-sem${period.semester}`
  if (period.type === 'mes') return `${period.year}-${String(period.month).padStart(2, '0')}`
  return 'completo'
}

export async function exportBackup(period = { type: 'tudo' }) {
  const data = {}
  for (const table of TABLES) {
    const rows = await db[table].toArray()
    data[table] = DATED_TABLES.has(table) ? filterByPeriod(rows, period) : rows
  }
  const payload = {
    app: 'controle-producao',
    version: 2,
    kind: 'backup',
    period,
    exportedAt: new Date().toISOString(),
    data,
  }
  downloadJSON(payload, `backup-producao-${periodSlug(period)}.json`)
}

// Exporta so os registros (producao) de um periodo — usado em "Enviar producao".
export async function exportProducao(period) {
  const allRecords = await db.records.toArray()
  const payload = {
    app: 'controle-producao',
    version: 2,
    kind: 'producao',
    period,
    exportedAt: new Date().toISOString(),
    data: { records: filterByPeriod(allRecords, period) },
  }
  const filename = `producao-${periodSlug(period)}.json`
  return { payload, filename }
}

export async function readImportFile(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (!payload || typeof payload.data !== 'object') {
    throw new Error('Arquivo invalido.')
  }
  // Compat com backups exportados antes de existir period/kind no arquivo.
  if (!payload.kind) payload.kind = 'backup'
  if (!payload.period) payload.period = { type: 'tudo' }
  return payload
}

// Restauracao total: substitui o conteudo atual das tabelas pelo do backup.
// So deve ser usada quando period.type === 'tudo'.
export async function importBackup(payload) {
  await db.transaction('rw', TABLES.map((t) => db[t]), async () => {
    for (const table of TABLES) {
      const rows = Array.isArray(payload.data[table]) ? payload.data[table] : []
      await db[table].clear()
      if (rows.length) await db[table].bulkAdd(rows)
    }
  })
}

// Importacao aditiva: soma ao que ja existe, pulando ids ja presentes
// (evita duplicar se o mesmo arquivo for importado mais de uma vez).
// Usada para qualquer periodo parcial (mes/semestre/ano) e para producao.
export async function importMerge(payload) {
  const tables = TABLES.filter((t) => Array.isArray(payload.data[t]) && payload.data[t].length > 0)
  const result = {}
  await db.transaction('rw', tables.map((t) => db[t]), async () => {
    for (const table of tables) {
      const rows = payload.data[table]
      const existingIds = new Set(
        (await db[table].bulkGet(rows.map((r) => r.id))).filter(Boolean).map((r) => r.id)
      )
      const toAdd = rows.filter((r) => !existingIds.has(r.id))
      if (toAdd.length) await db[table].bulkAdd(toAdd)
      result[table] = { imported: toAdd.length, skipped: rows.length - toAdd.length }
    }
  })
  return result
}
