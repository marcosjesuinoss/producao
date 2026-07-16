import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { dateBR, brl, num } from './format.js'

/*
  Exportacao PDF — mesmo conjunto de registros do CSV, mas formatado como
  relatorio (titulo, escopo, tabela e linha de totais) pra imprimir ou
  enviar a gerencia.
*/
export function exportPdf(records, scopeDescription, filename = 'producao.pdf') {
  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.setTextColor(20)
  doc.text('Relatório de Produção', 14, 18)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(scopeDescription, 14, 25)
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 30)

  const totalQuantity = records.reduce((s, r) => s + (r.quantity || 0), 0)
  const totalValue = records.reduce((s, r) => s + (r.value || 0), 0)

  autoTable(doc, {
    startY: 36,
    head: [['Data', 'Produto', 'Conta', 'Quantidade', 'Valor', 'Observações']],
    body: records.map((r) => [
      dateBR(r.date),
      r.product,
      r.account || '—',
      r.quantity ? num(r.quantity) : '—',
      r.value ? brl(r.value) : '—',
      r.notes || '',
    ]),
    foot: [[`${records.length} registro${records.length === 1 ? '' : 's'}`, '', '', num(totalQuantity), brl(totalValue), '']],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
  })

  doc.save(filename)
}

// nome do produto -> slug seguro pra nome de arquivo (sem acentos/simbolos).
const slugify = (s) =>
  String(s)
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'produto'

/*
  PDF do "Detalhamento" de UM produto (popup de Resumo/Acumulado):
  titulo = nome do produto, subtitulo = "N registros · total ...", e a
  lista de registros (data, conta, observacoes, valor/quantidade).
*/
export function exportProductRecordsPdf({ product, records, isValue, total, month, year }) {
  const doc = new jsPDF()
  const totalStr = isValue ? brl(total) : num(total)
  const countStr = `${records.length} registro${records.length === 1 ? '' : 's'}`

  doc.setFontSize(16)
  doc.setTextColor(20)
  doc.text(product, 14, 18)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${countStr} · total ${totalStr}`, 14, 25)
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 30)

  autoTable(doc, {
    startY: 36,
    head: [['Data', 'Conta', 'Observações', isValue ? 'Valor' : 'Quantidade']],
    body: records.map((r) => [
      dateBR(r.date),
      r.account || '—',
      r.notes?.trim() || '',
      isValue ? (r.value != null ? brl(r.value) : '—') : num(r.quantity),
    ]),
    foot: [['', '', countStr, totalStr]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
  })

  const mm = String(month).padStart(2, '0')
  doc.save(`${slugify(product)}_${mm}_${year}.pdf`)
}
