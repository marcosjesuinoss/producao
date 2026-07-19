import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { dateBR, brl, num, FULL_MONTHS } from './format.js'

/*
  Exportacao PDF - mesmo conjunto de registros do CSV, mas formatado como
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
      r.account || '-',
      r.quantity ? num(r.quantity) : '-',
      r.value ? brl(r.value) : '-',
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
  certa de impressao - sem isso tudo sairia ~33% maior.
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
  colHeader: '#94a3b8',
  account: '#1e293b',
  date: '#94a3b8',
  note: '#94a3b8',
  value: '#0f172a',
  rowBorder: '#f1f5f9',
  headerBorder: '#e2e8f0',
}

// Alturas do card "hero" (em px de CSS, viram pt via px()).
const HERO = { pad: 32, titleBase: 24, subGap: 22, totalGap: 48, labelGap: 18 }
const heroHeightPx =
  HERO.pad + HERO.titleBase + HERO.subGap + HERO.totalGap + HERO.labelGap + HERO.pad

// Lista em colunas (Data | Conta | Observações | Valor), uma linha por
// registro. Larguras das 3 primeiras colunas fixas (em px); a de
// Observações ocupa o espaço restante - calculada em runtime (depende da
// largura da pagina).
const ROW = { padX: 20, rowH: 40, headerH: 34, colData: 78, colConta: 78, colValor: 110 }

// Encurta o texto ate caber em maxW (pt), ou devolve como esta. Usa "..."
// (3 pontos ASCII) em vez do glifo unico "…": a fonte Helvetica padrao do
// jsPDF MEDE a largura do "…" mas nao consegue desenha-lo - ele some do PDF
// silenciosamente (bug real encontrado e confirmado gerando um PDF de teste).
const ELLIPSIS = '...'
const truncateToWidth = (doc, text, maxW) => {
  if (!text || doc.getTextWidth(text) <= maxW) return text ?? ''
  let s = text
  while (s.length > 1 && doc.getTextWidth(s + ELLIPSIS) > maxW) s = s.slice(0, -1)
  return s + ELLIPSIS
}

// Fallback caso o chamador nao informe periodLabel explicitamente: deriva um
// texto so a partir dos meses, sem saber se veio do Resumo ou do Acumulado
// (por isso e so um fallback — ver o parametro periodLabel em
// exportProductRecordsPdf, que cada tela monta sabendo sua propria origem).
const fallbackPeriodLabel = (startMonth, endMonth, year) => {
  if (startMonth === endMonth) return `Mês de ${FULL_MONTHS[startMonth - 1]} de ${year}`
  if (startMonth === 1 && endMonth === 6) return `1º Semestre de ${year}`
  if (startMonth === 7 && endMonth === 12) return `2º Semestre de ${year}`
  if (startMonth === 1 && endMonth === 12) return `Ano de ${year}`
  return `${FULL_MONTHS[startMonth - 1]} a ${FULL_MONTHS[endMonth - 1]} de ${year}`
}

export function exportProductRecordsPdf({ product, records, isValue, total, startMonth, endMonth, year, periodLabel }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = px(44)
  const cardX = margin
  const cardW = pageW - margin * 2
  const pad = px(HERO.pad)
  const rowPadX = px(ROW.padX)
  const radius = px(16)
  const rowH = px(ROW.rowH)
  const headerH = px(ROW.headerH)

  // Posicoes das colunas (a partir da borda esquerda do conteudo do card).
  const contentX = cardX + rowPadX
  const contentW = cardW - rowPadX * 2
  const colDataX = contentX
  const colContaX = contentX + px(ROW.colData)
  const colObsX = contentX + px(ROW.colData) + px(ROW.colConta)
  const colValorRightX = contentX + contentW
  const colObsW = contentW - px(ROW.colData) - px(ROW.colConta) - px(ROW.colValor) - px(10)

  const totalStr = isValue ? brl(total) : num(total)
  const countStr = `${records.length} registro${records.length === 1 ? '' : 's'}`
  const periodStr = periodLabel || fallbackPeriodLabel(Number(startMonth), Number(endMonth), year)
  const subtitle = `${countStr} · ${periodStr} · Gerado em ${new Date().toLocaleDateString('pt-BR')}`

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

  // --- Distribui os registros entre paginas (a 1a divide espaco com o hero).
  // Cada pagina com lista tem seu proprio cabecalho de coluna repetido.
  const heroY = margin + px(30)
  const heroH = px(heroHeightPx)
  const listPad = px(8)
  const firstListY = heroY + heroH + px(24)
  const pages = []
  let current = { startY: firstListY, rows: [] }
  let used = listPad * 2 + headerH
  for (const r of records) {
    if (current.startY + used + rowH > pageH - margin && current.rows.length) {
      pages.push(current)
      current = { startY: margin, rows: [] }
      used = listPad * 2 + headerH
    }
    current.rows.push(r)
    used += rowH
  }
  pages.push(current)

  pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) doc.addPage()
    paintPageBg()

    if (pageIdx === 0) {
      // Eyebrow
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(10))
      doc.setTextColor(COLOR.eyebrow)
      doc.text('CONTROLE DE PRODUÇÃO · RELATÓRIO', margin, margin + px(10), { charSpace: px(1) })

      // Hero card
      paintCard(cardX, heroY, cardW, heroH)
      let y = heroY + px(HERO.pad)

      y += px(HERO.titleBase)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(28))
      doc.setTextColor(COLOR.title)
      doc.text(product, cardX + pad, y)

      y += px(HERO.subGap)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(13))
      doc.setTextColor(COLOR.subtitle)
      doc.text(subtitle, cardX + pad, y)

      y += px(HERO.totalGap)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(40))
      doc.setTextColor(COLOR.total)
      doc.text(totalStr, cardX + pad, y)

      y += px(HERO.labelGap)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(11))
      doc.setTextColor(COLOR.totalLabel)
      doc.text(isValue ? 'VALOR TOTAL PRODUZIDO' : 'TOTAL PRODUZIDO', cardX + pad, y, { charSpace: px(0.55) })
    }

    // Card da lista de registros
    const listH = listPad * 2 + headerH + page.rows.length * rowH
    paintCard(cardX, page.startY, cardW, listH)

    // Cabecalho de coluna (repete em toda pagina que tem lista)
    const headerBase = page.startY + listPad + px(21)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(px(9))
    doc.setTextColor(COLOR.colHeader)
    doc.text('DATA', colDataX, headerBase, { charSpace: px(0.3) })
    doc.text('CONTA', colContaX, headerBase, { charSpace: px(0.3) })
    doc.text('OBSERVAÇÕES', colObsX, headerBase, { charSpace: px(0.3) })
    doc.text(isValue ? 'VALOR' : 'QUANTIDADE', colValorRightX, headerBase, { align: 'right', charSpace: px(0.3) })

    const headerLineY = page.startY + listPad + headerH
    doc.setDrawColor(COLOR.headerBorder)
    doc.setLineWidth(px(1))
    doc.line(cardX + rowPadX, headerLineY, cardX + cardW - rowPadX, headerLineY)

    let rowTop = headerLineY
    page.rows.forEach((r, i) => {
      const base = rowTop + px(26)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(11))
      doc.setTextColor(COLOR.date)
      doc.text(dateBR(r.date), colDataX, base)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(12))
      doc.setTextColor(COLOR.account)
      doc.text(r.account || '-', colContaX, base)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(px(10))
      doc.setTextColor(COLOR.note)
      const note = truncateToWidth(doc, r.notes?.trim() || '-', colObsW)
      doc.text(note, colObsX, base)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(px(13))
      doc.setTextColor(COLOR.value)
      const valStr = isValue ? (r.value != null ? brl(r.value) : '-') : num(r.quantity)
      doc.text(valStr, colValorRightX, base, { align: 'right' })

      rowTop += rowH
      if (i < page.rows.length - 1) {
        doc.setDrawColor(COLOR.rowBorder)
        doc.setLineWidth(px(1))
        doc.line(cardX + rowPadX, rowTop, cardX + cardW - rowPadX, rowTop)
      }
    })
  })

  const startMM = String(startMonth).padStart(2, '0')
  const endMM = String(endMonth).padStart(2, '0')
  const periodSuffix = startMonth === endMonth ? `${startMM}_${year}` : `${startMM}-${endMM}_${year}`
  doc.save(`${slugify(product)}_${periodSuffix}.pdf`)
}
