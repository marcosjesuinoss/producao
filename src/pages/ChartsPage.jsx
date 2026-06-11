import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { annualSummary, productBreakdown } from '../lib/summaries.js'
import { useTheme } from '../context/ThemeContext.jsx'
import MonthlyGoalChart from '../components/charts/MonthlyGoalChart.jsx'
import AnnualLineChart from '../components/charts/AnnualLineChart.jsx'
import ProductChart from '../components/charts/ProductChart.jsx'
import { MONTHS } from '../lib/format.js'

// Tela de graficos — Meta x Realizado.
export default function ChartsPage() {
  const { theme } = useTheme()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [annual, setAnnual] = useState(null)
  const [breakdown, setBreakdown] = useState([])

  const tick = useLiveQuery(async () => (await db.records.count()) + (await db.goals.count()), [], 0)

  useEffect(() => {
    annualSummary({ year }).then(setAnnual)
    productBreakdown({ year }).then(setBreakdown)
  }, [year, tick])

  if (!annual) return <p className="text-muted">Carregando…</p>

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Graficos — Meta x Realizado</h2>
        <input type="number" className="input w-28" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Ano dos graficos" />
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Por mes — Meta vs Realizado ({year})</h3>
        <MonthlyGoalChart byMonth={annual.byMonth} theme={theme} />
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Acumulado anual vs Meta acumulada</h3>
        <AnnualLineChart byMonth={annual.byMonth} theme={theme} />
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Por produto — {MONTHS[now.getMonth()]}/{now.getFullYear()}</h3>
        {breakdown.length
          ? <ProductChart breakdown={breakdown} theme={theme} />
          : <p className="text-muted text-sm">Sem dados no mes vigente.</p>}
      </div>
    </section>
  )
}
