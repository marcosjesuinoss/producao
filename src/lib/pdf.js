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
