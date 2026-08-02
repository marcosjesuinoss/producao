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

export default function EvolucaoChart({ series, useValue, referenceLine, target }) {
  const fmt = useValue ? brl : num

  // Cor solida por serie — usada no tracinho do tooltip (uma gradiente nao
  // da pra representar num marcador tao pequeno).
  const tooltipColor = (label) => {
    if (label === 'Meta 90%') return '#eab308'
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
    if (referenceLine > 0) {
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

    return { labels, datasets }
  }, [series, referenceLine])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
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
  }), [useValue, fmt, target])

  return (
    <div style={{ height: '220px' }}>
      <Line data={data} options={options} />
    </div>
  )
}
