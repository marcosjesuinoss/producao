import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { dateBR, brl, num, FULL_MONTHS } from './format.js'

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
  PDF do "Detalhamento" de UM produto (popup de Resumo/Acumulado), em
  layout de cards espelhando a linguagem visual do app, traduzida pra um
  contexto claro/imprimivel: fundo cinza, card "hero" com o total em
  destaque e card com a lista de registros.

  O documento e em PONTOS, mas o design foi especificado em px de CSS:
  px() converte (1px = 0.75pt) pra reproduzir as proporcoes na escala
  certa de impressao — sem isso tudo sairia ~33% maior.
*/
const px = (n) => n * 0.75

const COLOR = {
  pageBg: '#f8fafc',
  card: '#ffffff',
  shadow: '#e8edf3',
  eyebrow: '#94a3b8',
  title: '#0f172a',
  subtitle: '#64748b',
  total: '#0891b2',
  totalLabel: '#94a3b8',
  account: '#1e293b',
  date: '#94a3b8',
  note: '#cbd5e0',
  value: '#0f172a',
  rowBorder: '#f1f5f9',
}

// Alturas do card "hero" (em px de CSS, viram pt via px()).
const HERO = { pad: 24, titleBase: 18, subGap: 18, totalGap: 40, labelGap: 14 }
const heroHeightPx =
  HERO.pad + HERO.titleBase + HERO.subGap + HERO.totalGap + HERO.labelGap + HERO.pad

// Altura de uma linha da lista: a observacao so ocupa espaco quando existe.
const rowHeightPx = (r) => 22 + 12 + (r.notes?.trim() ? 11 : 0) + 12

export function exportProductRecordsPdf({ product, records, isValue, total, month, year }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = px(32)
  const cardX = margin
  const cardW = pageW - margin * 2
  const pad = px(HERO.pad)
  const radius = px(16)

  const totalStr = isValue ? brl(total) : num(total)
  const countStr = `${records.length} registro${records.length === 1 ? '' : 's'}`
  const subtitle = `${countStr} · ${FULL_MONTHS[Number(month) - 1]} ${year} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`

  const paintPageBg = () => {
    doc.setFillColor(COLOR.pageBg)
    doc.rect(0, 0, pageW, pageH, 'F')
  }

  // box-shadow: 0 1px 3px rgba(0,0,0,0.08) -> um retangulo levemente
  // deslocado atras do card (jsPDF nao tem sombra de verdade).
  const paintCard = (x, y, w, h) => {
    doc.setFillColor(COLOR.shadow)
    doc.roundedRect(x, y + px(2), w, h, radius, radius, 'F')
    doc.setFillColor(COLOR.card)
    doc.roundedRect(x, y, w, h, radius, radius, 'F')
  }

  // --- Distribui os registros entre paginas (a 1a divide espaco com o hero)
  const heroY = margin + px(20)
  const heroH = px(heroHeightPx)
  const listPad = px(8)
  const firstListY = heroY + heroH + px(16)
  const pages = []
  let current = { startY: firstListY, rows: [] }
  let used = listPad * 2
  for (const r of records) {
    const h = px(rowHeightPx(r))
    if (current.startY + used + h > pageH - margin && current.rows.length) {
      pages.push(current)
      current = { startY: margin, rows: [] }
      used = listPad * 2
    }
    current.rows.push(r)
    used += h
  }
  pages.push(current)

  pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) doc.addPage()
    paintPageBg()

    if (pageIdx === 0) {
      // Eyebrow
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(9))
      doc.setTextColor(COLOR.eyebrow)
      doc.text('CONTROLE DE PRODUÇÃO · RELATÓRIO', margin, margin + px(9), { charSpace: px(0.9) })

      // Hero card
      paintCard(cardX, heroY, cardW, heroH)
      let y = heroY + px(HERO.pad)

      y += px(HERO.titleBase)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(22))
      doc.setTextColor(COLOR.title)
      doc.text(product, cardX + pad, y)

      y += px(HERO.subGap)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(11))
      doc.setTextColor(COLOR.subtitle)
      doc.text(subtitle, cardX + pad, y)

      y += px(HERO.totalGap)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(32))
      doc.setTextColor(COLOR.total)
      doc.text(totalStr, cardX + pad, y)

      y += px(HERO.labelGap)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(9))
      doc.setTextColor(COLOR.totalLabel)
      doc.text(isValue ? 'VALOR TOTAL PRODUZIDO' : 'TOTAL PRODUZIDO', cardX + pad, y, { charSpace: px(0.45) })
    }

    // Card da lista de registros
    const listH = listPad * 2 + page.rows.reduce((s, r) => s + px(rowHeightPx(r)), 0)
    paintCard(cardX, page.startY, cardW, listH)

    let rowTop = page.startY + listPad
    page.rows.forEach((r, i) => {
      const h = px(rowHeightPx(r))
      const note = r.notes?.trim()

      const accBase = rowTop + px(22)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(11))
      doc.setTextColor(COLOR.account)
      doc.text(r.account ? `Conta ${r.account}` : 'Sem conta', cardX + pad, accBase)

      const dateBase = accBase + px(12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(10))
      doc.setTextColor(COLOR.date)
      doc.text(dateBR(r.date), cardX + pad, dateBase)

      if (note) {
        doc.setFontSize(px(9))
        doc.setTextColor(COLOR.note)
        doc.text(note, cardX + pad, dateBase + px(11))
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(11))
      doc.setTextColor(COLOR.value)
      const valStr = isValue ? (r.value != null ? brl(r.value) : '—') : num(r.quantity)
      doc.text(valStr, cardX + cardW - pad, accBase, { align: 'right' })

      rowTop += h
      if (i < page.rows.length - 1) {
        doc.setDrawColor(COLOR.rowBorder)
        doc.setLineWidth(px(1))
        doc.line(cardX + pad, rowTop, cardX + cardW - pad, rowTop)
      }
    })
  })

  const mm = String(month).padStart(2, '0')
  doc.save(`${slugify(product)}_${mm}_${year}.pdf`)
}
