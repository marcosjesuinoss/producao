import { Line } from 'react-chartjs-2'
import { MONTHS } from '../../lib/format.js'
import { baseOptions, themeColors } from './chartSetup.js'

// Linha do acumulado anual: Realizado acumulado vs Meta acumulada.
export default function AnnualLineChart({ byMonth, theme }) {
  const c = themeColors()
  void theme
  let accReal = 0
  let accGoal = 0
  const realAcc = byMonth.map((m) => (accReal += m.quantity))
  const goalAcc = byMonth.map((m) => (accGoal += m.target))

  const data = {
    labels: MONTHS,
    datasets: [
      { label: 'Acumulado realizado', data: realAcc, borderColor: c.brand, backgroundColor: c.brand, tension: 0.3, fill: false },
      { label: 'Meta acumulada', data: goalAcc, borderColor: c.warn, backgroundColor: c.warn, borderDash: [6, 4], tension: 0.3, fill: false }
    ]
  }
  return (
    <div style={{ height: 300 }}>
      <Line data={data} options={baseOptions(c)} aria-label="Grafico de linha acumulado anual versus meta acumulada" />
    </div>
  )
}
