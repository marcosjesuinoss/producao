import { Bar } from 'react-chartjs-2'
import { baseOptions, themeColors } from './chartSetup.js'

// Producao por produto no mes vigente (Realizado vs Meta).
export default function ProductChart({ breakdown, theme }) {
  const c = themeColors()
  void theme
  const data = {
    labels: breakdown.map((b) => b.product),
    datasets: [
      { label: 'Realizado', data: breakdown.map((b) => b.quantity), backgroundColor: c.brand, borderRadius: 4 },
      { label: 'Meta', data: breakdown.map((b) => b.target), backgroundColor: c.warn, borderRadius: 4 }
    ]
  }
  const options = { ...baseOptions(c), indexAxis: 'y' } // barras horizontais
  return (
    <div style={{ height: Math.max(220, breakdown.length * 48) }}>
      <Bar data={data} options={options} aria-label="Grafico por produto do mes vigente" />
    </div>
  )
}
