export function getProgressColor(pct) {
  if (pct === 0) return '#374151'
  if (pct <= 50) return '#ef4444'
  if (pct <= 80) return lerpColor('#ef4444', '#eab308', (pct - 50) / 30)
  if (pct <= 100) return lerpColor('#eab308', '#22c55e', (pct - 80) / 20)
  return '#22c55e'
}

function lerpColor(a, b, t) {
  const ah = a.replace('#', '')
  const bh = b.replace('#', '')
  const ar = parseInt(ah.slice(0, 2), 16)
  const ag = parseInt(ah.slice(2, 4), 16)
  const ab = parseInt(ah.slice(4, 6), 16)
  const br = parseInt(bh.slice(0, 2), 16)
  const bg = parseInt(bh.slice(2, 4), 16)
  const bb = parseInt(bh.slice(4, 6), 16)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const b2 = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${b2})`
}
