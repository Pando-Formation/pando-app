import type { MonthlyPoint } from '@/lib/pilotage'

const WIDTH = 480
const HEIGHT = 200
const PAD = { top: 28, bottom: 28, left: 12, right: 12 }

/**
 * Single-series trend line — server-rendered SVG, no chart library, no
 * client JS. One accent hue (this is a single series: identity is already
 * named by the card title, so no legend box — see dataviz skill,
 * marks-and-anatomy.md). Every point is direct-labeled: five months is few
 * enough that labeling all of them beats hiding values behind hover, and a
 * native <title> still gives a hover value for free.
 */
export function LineChart({ data, formatValue }: { data: MonthlyPoint[]; formatValue: (v: number) => string }) {
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const max = Math.max(...data.map((d) => d.value), 1)
  const step = data.length > 1 ? plotW / (data.length - 1) : 0

  const points = data.map((d, i) => ({
    ...d,
    x: PAD.left + i * step,
    y: PAD.top + plotH - (d.value / max) * plotH,
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Évolution du CA contractualisé sur les derniers mois">
      <line
        x1={PAD.left}
        y1={PAD.top + plotH}
        x2={WIDTH - PAD.right}
        y2={PAD.top + plotH}
        stroke="var(--color-border-default)"
        strokeWidth={1}
      />

      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => {
        // The first/last labels sit at the plot's own edge — a centered
        // anchor there overflows the viewBox and gets clipped. Anchor
        // outward instead so the label stays inside, never cut off.
        const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2}>
              <title>{`${p.label} — ${formatValue(p.value)}`}</title>
            </circle>
            <text x={p.x} y={Math.max(p.y - 12, 12)} textAnchor={anchor} fontSize={11} fill="var(--color-text-secondary)">
              {formatValue(p.value)}
            </text>
            <text x={p.x} y={HEIGHT - 6} textAnchor={anchor} fontSize={11} fill="var(--color-text-tertiary)">
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
