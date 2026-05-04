/**
 * HealthBadge — circular score 0-100 with traffic-light color.
 * Used on the Projects list and ProjectDetail.
 */
const COLOR = {
  green:  '#3aaf6c',
  yellow: '#f0b429',
  red:    '#d23b3b',
}

export default function HealthBadge({ score, status, size = 56, label }) {
  const pct   = Math.max(0, Math.min(100, score ?? 0))
  const color = COLOR[status] || COLOR.yellow
  const r     = (size - 6) / 2
  const c     = 2 * Math.PI * r
  const dash  = (pct / 100) * c

  return (
    <div className="health-badge" title={label || `Saúde da obra: ${pct.toFixed(0)}/100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={c / 4}
                strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="health-badge-text" style={{ color }}>
        {pct.toFixed(0)}
      </div>
    </div>
  )
}
