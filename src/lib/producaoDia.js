// Preferencias do card "Produção do Dia" (nome do gerente + agencia
// exibidos no cabecalho da imagem gerada) — ficam so no aparelho
// (localStorage), igual as outras preferencias de dispositivo do app.
import { db } from '../db/db.js'
import { VALUE_PRODUCTS, todayISO } from './format.js'

const GERENTE_KEY = 'producaoImagemGerente'
const AGENCIA_KEY = 'producaoImagemAgencia'

export const getImagemGerente = () => localStorage.getItem(GERENTE_KEY) || ''
export const setImagemGerente = (v) => localStorage.setItem(GERENTE_KEY, String(v ?? '').trim())

export const getImagemAgencia = () => localStorage.getItem(AGENCIA_KEY) || ''
export const setImagemAgencia = (v) => localStorage.setItem(AGENCIA_KEY, String(v ?? '').replace(/\D/g, '').slice(0, 4))

// Agrega os lancamentos de HOJE (data real do aparelho, independente do mes
// navegado no app) por produto — cada produto aparece UMA vez no resultado,
// com quantidade e valor somados, mesmo com varios lancamentos no dia.
export async function getTodayBreakdown() {
  const today = todayISO()
  const records = (await db.records.where('date').equals(today).toArray()).filter((r) => !r.ignored)

  const customProds = await db.products.toArray()
  const customMap = new Map(customProds.map((p) => [p.name, p.useValue]))
  const isValueProduct = (name) => (customMap.has(name) ? customMap.get(name) : VALUE_PRODUCTS.has(name))

  const map = new Map()
  for (const r of records) {
    const cur = map.get(r.product) || { product: r.product, quantity: 0, value: 0 }
    cur.quantity += r.quantity || 0
    cur.value += r.value || 0
    map.set(r.product, cur)
  }

  const items = [...map.values()]
    .map((b) => ({ ...b, useValue: isValueProduct(b.product) }))
    .sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'))

  return { date: today, totalRecords: records.length, items }
}
