/** A little "empty" badge — color only, no text — so a card's TITLE stays the title and severity is a glance, not a re-read. */
export function SeverityDot({ severity }: { severity: 'danger' | 'warning' }) {
  return (
    <span
      aria-label={severity === 'danger' ? 'Critique' : 'À surveiller'}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: severity === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)',
        flexShrink: 0,
      }}
    />
  )
}
