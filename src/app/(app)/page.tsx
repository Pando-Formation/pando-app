import { requireSession } from '@/lib/authz'
import { euros } from '@/lib/money'
import { getAlerts, groupAlertsByCategory, getParcoursAtRisk, getCaTotal, getMargin, getMonthlyCaSeries, getMonthlyParticipantsSeries } from '@/lib/pilotage'
import { CaChart } from '@/components/pilotage/CaChart'
import { ParticipantsChart } from '@/components/pilotage/ParticipantsChart'
import { FinancialStats, type FinancialStat } from '@/components/pilotage/FinancialStats'
import { PageHero } from '@/components/page-hero'
import { AlertCard } from '@/components/pilotage/AlertCard'
import { EmptyAlerts } from '@/components/pilotage/EmptyAlerts'
import { ParcoursAtRiskTable } from '@/components/pilotage/ParcoursAtRiskTable'

/**
 * 🔴 THE HOME SCREEN IS A RISK RADAR, NOT A VANITY DASHBOARD. Alerts are
 * still what the page is built around: each alert-category card gets the
 * same half-width tile the charts get (not a footnote), and the full
 * parcours-at-risk table is never truncated behind a "view all."
 *
 * 🔴 Margin utilities (mb-*, mt-*) do nothing here — globals.css's own
 * `* { margin: 0 }` reset is unlayered and always beats Tailwind's layered
 * utilities, regardless of source order. Use inline `style` for vertical
 * rhythm outside the grid; `gap`/`padding` Tailwind utilities are unaffected
 * (not reset by that rule) and are safe to use normally.
 */
export default async function Home() {
  const session = await requireSession()
  const monthsSinceJanuary = new Date().getMonth() + 1
  const [alerts, ca, margin, caSeries, participantsSeries] = await Promise.all([
    getAlerts(),
    getCaTotal(),
    getMargin(),
    getMonthlyCaSeries(monthsSinceJanuary),
    getMonthlyParticipantsSeries(monthsSinceJanuary),
  ])
  const parcoursAtRisk = await getParcoursAtRisk(alerts)
  const alertGroups = groupAlertsByCategory(alerts)

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  const prevCa = caSeries.at(-2)?.value
  const lastCa = caSeries.at(-1)?.value
  const caDeltaPct = prevCa && lastCa !== undefined ? ((lastCa - prevCa) / prevCa) * 100 : undefined

  const stats: FinancialStat[] = [
    {
      label: 'CA encaissé (HT)',
      value: euros(ca),
      deltaPct: caDeltaPct,
      deltaLabel: 'vs mois précédent',
    },
    {
      label: 'Coût formateurs (réel)',
      value: euros(margin.formateurCost),
    },
    {
      label: 'Marge',
      value: euros(margin.margin),
    },
    {
      label: 'Parcours à risque',
      value: String(parcoursAtRisk.length),
    },
  ]

  return (
    <>
      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          PANDO
        </div>
        <h1 className="t-title-1" style={{ marginBottom: 'var(--space-2)' }}>
          Bonjour {session.user.name?.split(' ')[0] ?? ''}.
        </h1>
        <p className="t-body-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {alerts.length} alerte{alerts.length !== 1 ? 's' : ''} · {dangerCount} critique{dangerCount !== 1 ? 's' : ''} ·{' '}
          {warningCount} à surveiller.
        </p>
      </PageHero>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 lg:grid-cols-4">
        <FinancialStats stats={stats} />
        <CaChart data={caSeries} />
        <ParticipantsChart data={participantsSeries} />
        {alertGroups.length === 0 ? (
          <EmptyAlerts />
        ) : (
          alertGroups.map((group) => <AlertCard key={group.category} group={group} />)
        )}
        <ParcoursAtRiskTable data={parcoursAtRisk} />
      </div>
    </>
  )
}
