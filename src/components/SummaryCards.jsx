import { brl, num } from '../lib/format.js'
import { getProgressColor } from '../utils/progressColor.js'
import ProgressBar from './ui/ProgressBar.jsx'

function Card({ title, children, hint }) {
  return (
    <div className="card">
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{title}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{children}</div>
      {hint && <div className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{hint}</div>}
    </div>
  )
}

export default function SummaryCards({ monthly, annual, general }) {
  if (!monthly) return null
  const pct = monthly.achievedPct
  const diff = monthly.diff
  const diffColor = diff >= 0 ? 'var(--c-good)' : 'var(--c-bad)'

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card title="Realizado (mes)" hint={`${monthly.count} lancamentos`}>
        {num(monthly.quantity)} <span className="text-base" style={{ color: 'var(--text-muted)' }}>un</span>
      </Card>
      <Card title="Meta (mes)" hint={monthly.target.value ? brl(monthly.target.value) : 'sem meta de valor'}>
        {num(monthly.target.quantity)} <span className="text-base" style={{ color: 'var(--text-muted)' }}>un</span>
      </Card>
      <Card title="Diferenca" hint={pct != null ? `${pct}% da meta` : 'defina uma meta'}>
        <span style={{ color: diffColor }}>{diff >= 0 ? '+' : ''}{num(diff)}</span>
      </Card>
      <Card title="Valor (mes)" hint={`Anual: ${brl(annual?.value)}`}>
        {brl(monthly.value)}
      </Card>

      <div className="card sm:col-span-2 lg:col-span-4">
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: 'var(--text-muted)' }}>Progresso da meta mensal</span>
          <span
            className="font-medium"
            style={{ color: pct != null ? getProgressColor(pct) : 'var(--text-faint)' }}
          >
            {pct != null ? pct + '%' : '—'}
          </span>
        </div>
        <ProgressBar value={pct || 0} max={100} height={5} />
        <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>
            Anual: <strong style={{ color: 'var(--text-primary)' }}>{num(annual?.quantity)} un</strong>
          </span>
          <span>
            Geral: <strong style={{ color: 'var(--text-primary)' }}>{num(general?.quantity)} un</strong> ({brl(general?.value)})
          </span>
        </div>
      </div>
    </div>
  )
}
