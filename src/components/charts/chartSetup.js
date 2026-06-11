import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Registro unico dos modulos do Chart.js usados no app.
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

// Le as cores do tema atual (CSS variables) para os graficos acompanharem claro/escuro.
export function themeColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (n) => css.getPropertyValue(n).trim()
  return {
    fg: v('--c-fg'),
    muted: v('--c-muted'),
    grid: v('--c-border'),
    brand: v('--c-brand'),
    brandSoft: v('--c-brand-soft'),
    good: v('--c-good'),
    warn: v('--c-warn')
  }
}

export function baseOptions(colors) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: colors.fg, boxWidth: 12 } },
      tooltip: { enabled: true }
    },
    scales: {
      x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
      y: { ticks: { color: colors.muted }, grid: { color: colors.grid }, beginAtZero: true }
    }
  }
}
