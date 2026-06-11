import { brl, num } from '../lib/format.js'

function Card({ title, children, hint }) {
  return (
    <div className="card">
      <div className="text-muted text-sm">{title}</div>
      <div className="mt-1 text-2xl font-bold">{children}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  )
}

// Mostra resumo do mes: realizado, meta e diferenca + barra de progresso.
export default function SummaryCards({ monthly, annual, general }) {
  if (!monthly) return null
  const pct = monthly.achievedPct
  const diff = monthly.diff
  const diffColor = diff >= 0 ? 'var(--c-good)' : 'var(--c-bad)'

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card title="Realizado (mes)" hint={`${monthly.count} lancamentos`}>
        {num(monthly.quantity)} <span className="text-base text-muted">un</span>
      </Card>
      <Card title="Meta (mes)" hint={monthly.target.value ? brl(monthly.target.value) : 'sem meta de valor'}>
        {num(monthly.target.quantity)} <span className="text-base text-muted">un</span>
      </Card>
      <Card title="Diferenca" hint={pct != null ? `${pct}% da meta` : 'defina uma meta'}>
        <span style={{ color: diffColor }}>{diff >= 0 ? '+' : ''}{num(diff)}</span>
      </Card>
      <Card title="Valor (mes)" hint={`Anual: ${brl(annual?.value)}`}>
        {brl(monthly.value)}
      </Card>

      <div className="card sm:col-span-2 lg:col-span-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">Progresso da meta mensal</span>
          <span className="font-medium">{pct != null ? pct + '%' : '—'}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}
          role="progressbar" aria-valuenow={pct || 0} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full transition-all"
            style={{ width: Math.min(100, pct || 0) + '%', background: 'var(--c-brand)' }} />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted">
          <span>Anual: <strong className="text-[color:var(--c-fg)]">{num(annual?.quantity)} un</strong></span>
          <span>Geral: <strong className="text-[color:var(--c-fg)]">{num(general?.quantity)} un</strong> ({brl(general?.value)})</span>
        </div>
      </div>
    </div>
  )
}
