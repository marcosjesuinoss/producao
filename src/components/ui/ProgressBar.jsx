import { getProgressColor } from '../../utils/progressColor.js'

export default function ProgressBar({ value, max, height = 4, dimmed = false }) {
  const rawPct = max > 0 ? (value / max) * 100 : value > 0 ? 100 : 0
  const clampedPct = Math.min(100, rawPct)
  const isTrueZero = value === 0
  // Pass rawPct (not rounded) so values like 0.021% get red, not gray
  const color = isTrueZero ? '#374151' : getProgressColor(rawPct)
  // Guarantee a visible sliver for any nonzero progress, even if rawPct < 1%
  const fillPct = isTrueZero ? 0 : Math.max(clampedPct, 1.5)
  const glow = rawPct > 100

  return (
    <div
      style={{
        height: `${height}px`,
        width: '100%',
        background: 'var(--bg-bar)',
        borderRadius: '99px',
        overflow: 'hidden',
        boxShadow: glow ? '0 0 8px #22c55e88' : 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${fillPct}%`,
          background: color,
          borderRadius: '0 99px 99px 0',
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
          opacity: dimmed ? 0.55 : 1,
        }}
      />
    </div>
  )
}
