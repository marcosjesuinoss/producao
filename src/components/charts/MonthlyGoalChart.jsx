import { Bar } from 'react-chartjs-2'
import { MONTHS } from '../../lib/format.js'
import { baseOptions, themeColors } from './chartSetup.js'

// Barras lado a lado por mes: Meta vs Realizado (ano corrente).
export default function MonthlyGoalChart({ byMonth, theme }) {
  const c = themeColors() // reavaliado a cada render (theme muda -> recalcula)
  void theme
  const data = {
    labels: MONTHS,
    datasets: [
      { label: 'Realizado', data: byMonth.map((m) => m.quantity), backgroundColor: c.brand, borderRadius: 4 },
      { label: 'Meta', data: byMonth.map((m) => m.target), backgroundColor: c.warn, borderRadius: 4 }
    ]
  }
  return (
    <div style={{ height: 300 }}>
      <Bar data={data} options={baseOptions(c)} aria-label="Grafico de barras meta versus realizado por mes" />
    </div>
  )
}
