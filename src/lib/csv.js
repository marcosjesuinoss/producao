import Papa from 'papaparse'
import { splitAccount } from './agencia.js'

/*
  Exportacao CSV (POST /export?format=csv) usando papaparse.
  Recebe os registros JA filtrados e dispara o download.
*/
export function recordsToCsv(records) {
  const rows = records.map((r) => {
    const { agencia, conta } = splitAccount(r.account)
    return {
      data: r.date,
      produto: r.product,
      agencia,
      conta,
      gerente: r.manager,
      quantidade: r.quantity,
      valor: r.value ?? '',
      observacoes: r.notes ?? ''
    }
  })
  return Papa.unparse(rows, { delimiter: ';' }) // ';' = melhor p/ Excel pt-BR
}

export function exportCsv(records, filename = 'producao.csv') {
  const csv = recordsToCsv(records)
  // BOM para acentuacao correta no Excel
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
