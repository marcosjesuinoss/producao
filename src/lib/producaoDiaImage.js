import { brl, num } from './format.js'

// Le as cores de destaque atuais (definidas em runtime pelo AccentProvider)
// direto do :root — mesmo truque ja usado em lib/pdf.js pra jsPDF, aqui pro
// canvas 2D. --c-brand-fg ja vem calibrado (claro ou escuro) pra contrastar
// bem em cima do gradiente brand2->brand, entao reusamos ele pro texto.
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// "2026-08-12" -> "quarta-feira, 12 de agosto de 2026" — construtor local de
// Date (nao "new Date(string)") pra nao cair no bug classico de fuso
// horario, mesmo cuidado ja tomado em outros pontos do app (dateBR, etc.).
function fullDateBR(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${WEEKDAYS[date.getDay()]}, ${d} de ${MONTHS_FULL[m - 1]} de ${y}`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Quebra "text" em linhas que cabem em maxWidth, no maximo maxLines —
// a ultima linha usada ganha reticencias se sobrar texto.
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word
    if (ctx.measureText(attempt).width <= maxWidth || !current) {
      current = attempt
    } else {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) lines.length = maxLines
  const last = lines.length - 1
  while (lines[last] && ctx.measureText(lines[last] + '…').width > maxWidth && lines[last].length > 1) {
    lines[last] = lines[last].slice(0, -1)
  }
  if (words.join(' ') !== lines.join(' ') && lines.length === maxLines) {
    lines[last] = lines[last].replace(/…$/, '') + '…'
  }
  return lines
}

// Gera o card "Produção do Dia" num canvas e dispara o download como PNG.
// breakdown vem de getTodayBreakdown() (lib/producaoDia.js).
export function downloadProducaoDiaImage({ breakdown, gerente, agencia }) {
  const brand = cssVar('--c-brand') || '#2563eb'
  const brand2 = cssVar('--c-brand-2') || '#0891b2'
  const fg = cssVar('--c-brand-fg') || '#ffffff'

  const W = 1080
  const marginX = 72

  // Altura calculada a partir do conteudo (em vez de fixa) — sem o numero
  // grande de lancamentos, uma altura fixa deixava sobra de espaco vazio
  // grande demais quando tinha poucos produtos no dia.
  let contentY = 96 + 76 + 20 + 56 // eyebrow + titulo + gap + data
  if (gerente) contentY += 52
  if (agencia) contentY += 48
  const listY = contentY + 90
  const rowH = 92
  const listH = breakdown.items.length * rowH + 48
  const H = listY + listH + 164

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fundo — gradiente diagonal de base + manchas suaves desfocadas por
  // cima (mesh gradient simplificado), pra dar profundidade em vez de uma
  // cor chapada de ponta a ponta — mesmo espirito visual de telas de
  // "resumo"/conquista de outros apps.
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, brand2)
  bg.addColorStop(1, brand)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.filter = 'blur(140px)'
  ctx.globalAlpha = 0.55
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.arc(W * 0.88, H * 0.06, 260, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.4
  ctx.fillStyle = brand2
  ctx.beginPath()
  ctx.arc(W * 0.05, H * 0.4, 280, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.35
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.arc(W * 0.95, H * 0.85, 320, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  let y = 96

  // Eyebrow
  ctx.fillStyle = fg
  ctx.globalAlpha = 0.75
  ctx.font = '700 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('CONTROLE DE PRODUÇÃO', marginX, y)
  ctx.globalAlpha = 1

  // Titulo
  y += 76
  ctx.font = '800 72px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillText('Produção do Dia', marginX, y)

  // Gerente / Agencia
  y += 20
  ctx.font = '600 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  if (gerente) {
    y += 52
    ctx.fillText(`Gerente ${gerente}`, marginX, y)
  }
  if (agencia) {
    y += 48
    ctx.fillText(`Agência ${agencia}`, marginX, y)
  }

  // Data por extenso
  y += 56
  ctx.globalAlpha = 0.85
  ctx.font = '500 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillText(fullDateBR(breakdown.date), marginX, y)
  ctx.globalAlpha = 1

  // Cartao translucido com a lista de produtos
  roundRect(ctx, marginX, listY, W - marginX * 2, listH, 28)
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fill()

  let rowY = listY + 32
  const listPadX = 40
  const listW = W - marginX * 2 - listPadX * 2
  breakdown.items.forEach((item, idx) => {
    const cy = rowY + rowH * idx
    const totalStr = item.useValue ? brl(item.value) : num(item.quantity)

    ctx.font = '700 36px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.fillStyle = fg
    ctx.globalAlpha = 1
    const valueWidth = ctx.measureText(totalStr).width
    const nameMaxWidth = listW - valueWidth - 24

    ctx.font = '600 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    const [nameLine] = wrapText(ctx, item.product, nameMaxWidth, 1)
    ctx.fillText(nameLine, marginX + listPadX, cy + 40)

    ctx.font = '700 36px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(totalStr, marginX + listPadX + listW, cy + 40)
    ctx.textAlign = 'left'

    if (idx < breakdown.items.length - 1) {
      ctx.globalAlpha = 0.25
      ctx.fillStyle = fg
      ctx.fillRect(marginX + listPadX, cy + 58, listW, 1.5)
      ctx.globalAlpha = 1
    }
  })

  // Rodape
  ctx.globalAlpha = 0.7
  ctx.font = '500 24px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.fillStyle = fg
  ctx.fillText('Dados locais · offline-first', marginX, H - 64)
  ctx.globalAlpha = 1

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `producao-do-dia-${breakdown.date}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
