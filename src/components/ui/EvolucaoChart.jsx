import { useMemo } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { brl, num } from '../../lib/format.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

// Le uma custom property do :root — usado pra manter o grafico coerente
// com o tema ativo (Claro/Anoitecer/Escuro) sem hardcodar cores aqui.
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// Chart.js nao tem opcao nativa de "sumir sozinho" — o tooltip fica aberto
// ate o usuario tocar em outro lugar. Esse plugin observa todo evento do
// canvas e, enquanto o tooltip estiver visivel, reinicia um timer de 3s;
// ao estourar, fecha o tooltip programaticamente.
const autoHideTooltipPlugin = {
  id: 'autoHideTooltip',
  afterEvent(chart) {
    clearTimeout(chart.$tooltipHideTimer)
    // getActiveElements() reflete o estado logico na hora — ao contrario de
    // "opacity" (que e animado e so chega em 1 depois de alguns frames),
    // isso detecta o tooltip aberto no mesmo evento que o mostrou.
    if (chart.tooltip?.getActiveElements().length > 0) {
      chart.$tooltipHideTimer = setTimeout(() => {
        chart.setActiveElements([])
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 })
        chart.update()
      }, 3000)
    }
  },
  // O Chart.js nao dispara um hook chamado "destroy" — o nome certo e
  // "afterDestroy" (conferido no codigo-fonte da biblioteca). Com o nome
  // errado esse cleanup nunca rodava: um timer de 3s podia sobreviver a um
  // grafico ja destruido (troca rapida de produto) e tentar atualiza-lo.
  afterDestroy(chart) {
    clearTimeout(chart.$tooltipHideTimer)
  },
}

// Faixa sombreada nos dias de ferias. Desenha ANTES dos datasets
// (beforeDatasetsDraw) pra ficar por tras das linhas, nunca por cima.
// Recebe os dias via options.plugins.feriasBand.days (lista de numeros de
// dia do mes) e usa a propria escala X do grafico pra achar a posicao,
// entao acompanha zoom/resize sem conta manual.
const feriasBandPlugin = {
  id: 'feriasBand',
  beforeDatasetsDraw(chart, _args, opts) {
    const days = opts?.days
    if (!days?.length) return
    const { ctx, chartArea, scales } = chart
    const x = scales.x
    if (!x || !chartArea) return

    // Agrupa dias consecutivos num bloco so — um periodo de 10 dias vira
    // um retangulo, nao 10 colados (evita emendas visiveis por antialiasing).
    const sorted = [...days].sort((a, b) => a - b)
    const blocks = []
    let start = sorted[0]
    let prev = sorted[0]
    for (let i = 1; i <= sorted.length; i++) {
      const d = sorted[i]
      if (d !== prev + 1) {
        blocks.push([start, prev])
        start = d
      }
      prev = d
    }

    ctx.save()
    // canvas nao entende var() — resolve o valor do tema aqui.
    ctx.fillStyle = `rgba(${cssVar('--c-brand-rgb') || '96, 165, 250'}, 0.10)`
    for (const [from, to] of blocks) {
      // getPixelForValue usa o INDICE da categoria (dia 1 = indice 0).
      const left = x.getPixelForValue(from - 1)
      const right = x.getPixelForValue(to - 1)
      const half = (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2 || 0
      ctx.fillRect(left - half, chartArea.top, (right - left) + half * 2, chartArea.bottom - chartArea.top)
    }
    ctx.restore()
  },
}

// Projeção: extrapola o RITMO REAL do usuario (realizado ate hoje) pro resto
// do mes, seguindo a mesma "forma" da curva de ritmo esperado (cumulativeExpected
// ja cresce so nos dias uteis, na proporcao certa) — so escalada pelo ritmo
// real em vez do ritmo da meta. Nasce exatamente no ponto onde "Realizado"
// para hoje (sem quebra visual) e nunca ultrapassa a meta (100%).
function buildProjectionData(series, refDay, target) {
  const refIndex = refDay - 1
  if (refIndex < 0 || refIndex >= series.length) return null
  const refPoint = series[refIndex]
  const realized = refPoint.cumulativeActual
  const expectedAtRef = refPoint.cumulativeExpected
  if (realized == null || !(expectedAtRef > 0) || !(target > 0)) return null

  return series.map((p, i) => {
    if (i < refIndex) return null
    const raw = realized * (p.cumulativeExpected / expectedAtRef)
    return Math.min(target, raw)
  })
}

export default function EvolucaoChart({ series, useValue, referenceLine, target, refDay, showProjection, showMarker90, feriasDays }) {
  const fmt = useValue ? brl : num

  // Cor solida por serie — usada no tracinho do tooltip (uma gradiente nao
  // da pra representar num marcador tao pequeno).
  const tooltipColor = (label) => {
    if (label === 'Meta 90%') return '#eab308'
    if (label === 'Projeção') return '#22c55e'
    if (label === 'Realizado') return '#818cf8'
    return cssVar('--text-faint') || '#6b7280'
  }

  const data = useMemo(() => {
    const labels = series.map((p) => String(p.day))
    const datasets = [
      {
        label: 'Ritmo necessário',
        data: series.map((p) => p.cumulativeExpected),
        borderColor: cssVar('--text-faint') || '#6b7280',
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      },
      {
        label: 'Realizado',
        data: series.map((p) => p.cumulativeActual),
        borderColor: (ctx) => {
          const { chart } = ctx
          const { ctx: canvasCtx, chartArea } = chart
          if (!chartArea) return '#818cf8'
          const gradient = canvasCtx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
          gradient.addColorStop(0, '#06b6d4')
          gradient.addColorStop(1, '#818cf8')
          return gradient
        },
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.15,
        spanGaps: false,
      },
    ]

    // Linha reta e fixa em 90% da meta total do mes — referencia visual de
    // "quase la", independente do ritmo dia a dia.
    if (showMarker90 && referenceLine > 0) {
      datasets.push({
        label: 'Meta 90%',
        data: series.map(() => referenceLine),
        borderColor: '#eab308',
        borderDash: [2, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
      })
    }

    if (showProjection) {
      const projectionData = buildProjectionData(series, refDay, target)
      if (projectionData) {
        datasets.push({
          label: 'Projeção',
          data: projectionData,
          borderColor: '#22c55e',
          borderDash: [1, 3],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
          spanGaps: false,
        })
      }
    }

    return { labels, datasets }
  }, [series, referenceLine, showMarker90, showProjection, refDay, target])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      feriasBand: { days: feriasDays },
      tooltip: {
        usePointStyle: true,
        // Ordena os itens do tooltip pelo valor naquele dia — a linha que
        // esta visualmente mais alta no grafico aparece primeiro, invertendo
        // conforme o dia (as vezes Realizado esta acima do ritmo, as vezes
        // abaixo).
        itemSort: (a, b) => (b.parsed.y ?? -Infinity) - (a.parsed.y ?? -Infinity),
        callbacks: {
          title: (items) => `Dia ${items[0].label}`,
          label: (item) => `${item.dataset.label}: ${item.raw == null ? '—' : fmt(item.raw)}`,
          labelPointStyle: () => ({ pointStyle: 'line', rotation: 0 }),
          labelColor: (item) => {
            const color = tooltipColor(item.dataset.label)
            return { borderColor: color, backgroundColor: color, borderWidth: 2 }
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: cssVar('--text-faint') || '#9ca3af', maxTicksLimit: 8 },
      },
      y: {
        min: 0,
        // Topo do eixo = 100% da meta. suggestedMax so "sugere" — se algum
        // ponto passar da meta (produziu mais de 100%), o Chart.js ignora a
        // sugestao e reajusta o eixo pro valor real, maior.
        suggestedMax: target > 0 ? target : undefined,
        grid: { color: cssVar('--c-border') || 'rgba(148,163,184,0.15)' },
        ticks: {
          color: cssVar('--text-faint') || '#9ca3af',
          callback: (v) => (useValue ? brl(v).replace('R$', 'R$ ') : num(v)),
        },
      },
    },
  }), [useValue, fmt, target, feriasDays])

  return (
    <div style={{ height: '220px' }}>
      <Line data={data} options={options} plugins={[autoHideTooltipPlugin, feriasBandPlugin]} />
    </div>
  )
}
