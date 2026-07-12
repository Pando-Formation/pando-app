import type { MonthlyPoint } from '@/lib/pilotage'

const WIDTH = 480
const HEIGHT = 200
const PAD = { top: 24, bottom: 28, left: 12, right: 12 }
const MAX_BAR_WIDTH = 24

/**
 * Single-series monthly bar chart — server-rendered SVG. Bars are capped at
 * 24px and centered in their band (never fill the slot — see
 * marks-and-anatomy.md); 4px rounded data-end, square at the baseline.
 */
export function BarChart({ data }: { data: MonthlyPoint[] }) {
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const max = Math.max(...data.map((d) => d.value), 1)
  const bandWidth = plotW / data.length
  const barWidth = Math.min(MAX_BAR_WIDTH, bandWidth * 0.5)
  const baselineY = PAD.top + plotH

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Participants inscrits par mois">
      <line x1={PAD.left} y1={baselineY} x2={WIDTH - PAD.right} y2={baselineY} stroke="var(--color-border-default)" strokeWidth={1} />

      {data.map((d, i) => {
        const bandCenter = PAD.left + bandWidth * (i + 0.5)
        const barX = bandCenter - barWidth / 2
        const barHeight = (d.value / max) * plotH
        const barY = baselineY - barHeight
        const radius = Math.min(4, barHeight)
        return (
          <g key={i}>
            {barHeight > 0 && (
              <>
                <rect x={barX} y={barY} width={barWidth} height={barHeight} rx={radius} fill="var(--color-accent)">
                  <title>{`${d.label} — ${d.value} participant${d.value > 1 ? 's' : ''}`}</title>
                </rect>
                <rect x={barX} y={baselineY - radius} width={barWidth} height={radius} fill="var(--color-accent)" />
              </>
            )}
            <text x={bandCenter} y={barY - 8} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)">
              {d.value}
            </text>
            <text x={bandCenter} y={HEIGHT - 6} textAnchor="middle" fontSize={11} fill="var(--color-text-tertiary)">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
