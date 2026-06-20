import ProgressBar from './ProgressBar.jsx'

export default function StatCard({ label, value, target, pct, unit }) {
  return (
    <div
      style={{
        background: 'var(--bg-card-deep)',
        borderRadius: '12px',
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          color: 'var(--text-faint)',
          letterSpacing: '0.08em',
          fontWeight: 600,
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
        {unit && (
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '3px' }}>
            {unit}
          </span>
        )}
      </div>
      {target != null && (
        <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '2px' }}>
          meta {target}
        </div>
      )}
      {pct != null && (
        <div style={{ marginTop: '8px' }}>
          <ProgressBar value={pct} max={100} height={4} />
        </div>
      )}
    </div>
  )
}
