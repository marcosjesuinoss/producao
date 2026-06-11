import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { monthlySummary, annualSummary, generalSummary } from '../lib/summaries.js'
import SummaryCards from '../components/SummaryCards.jsx'
import { MONTHS } from '../lib/format.js'

// Tela inicial — resumo do mes vigente (somatorio, meta, diferenca).
export default function HomePage() {
  const now = new Date()
  const [summ, setSumm] = useState({})

  // recalcula sempre que a tabela de records/goals muda
  const tick = useLiveQuery(async () => (await db.records.count()) + (await db.goals.count()), [], 0)

  useEffect(() => {
    let alive = true
    Promise.all([monthlySummary(), annualSummary(), generalSummary()]).then(([monthly, annual, general]) => {
      if (alive) setSumm({ monthly, annual, general })
    })
    return () => { alive = false }
  }, [tick])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          Resumo de {MONTHS[now.getMonth()]}/{now.getFullYear()}
        </h2>
        <Link to="/registros" className="btn btn-brand">+ Novo registro</Link>
      </div>
      <SummaryCards monthly={summ.monthly} annual={summ.annual} general={summ.general} />
      <p className="text-xs text-muted">
        Dados salvos localmente no dispositivo (IndexedDB). Funciona offline.
      </p>
    </section>
  )
}
