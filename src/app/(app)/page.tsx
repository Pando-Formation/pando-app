import Link from 'next/link'
import { requireSession } from '@/lib/authz'
import { euros, compactEuros } from '@/lib/money'
import { getAlerts, groupAlertsByCategory, getParcoursAtRisk, getCaTotal, getMargin, getMonthlyCaSeries, getMonthlyParticipantsSeries } from '@/lib/pilotage'
import { LineChart } from '@/components/pilotage/LineChart'
import { BarChart } from '@/components/pilotage/BarChart'
import { SeverityDot } from '@/components/pilotage/SeverityDot'

/**
 * 🔴 THE HOME SCREEN IS A RISK RADAR, NOT A VANITY DASHBOARD.
 * The money cards are the SMALLEST stat scale (t-stat-md). The alerts are
 * still what the page is built around — grouped into cards by category so
 * five hard bounces don't bury the one unsigned convention as five separate
 * rows of the same problem.
 */
export default async function Home() {
  const session = await requireSession()
  const [alerts, ca, margin, caSeries, participantsSeries] = await Promise.all([
    getAlerts(),
    getCaTotal(),
    getMargin(),
    getMonthlyCaSeries(5),
    getMonthlyParticipantsSeries(5),
  ])
  const parcoursAtRisk = await getParcoursAtRisk(alerts)
  const alertGroups = groupAlertsByCategory(alerts)

  const dangerCount = alerts.filter((a) => a.severity === 'danger').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        PANDO
      </div>
      <h1 className="t-title-1" style={{ marginBottom: 'var(--space-8)' }}>
        Bonjour {session.user.name?.split(' ')[0] ?? ''}.
      </h1>

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Résumé financier
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)', maxWidth: 640, marginBottom: 'var(--space-9)' }}>
        <div className="card">
          <div className="t-stat-label">CA (HT, non annulé)</div>
          <div className="t-stat-md">{euros(ca)}</div>
          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
            Objectif non défini
          </p>
        </div>
        <div className="card">
          <div className="t-stat-label">Coût formateurs (réel)</div>
          <div className="t-stat-md">{euros(margin.formateurCost)}</div>
          <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
            TTC externe · 0 € interne
          </p>
        </div>
        <div className="card">
          <div className="t-stat-label">Marge</div>
          <div className="t-stat-md">{euros(margin.margin)}</div>
        </div>
      </div>

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Tendances
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-9)' }}>
        <div className="card">
          <div className="t-stat-label" style={{ marginBottom: 'var(--space-4)' }}>
            CA contractualisé — 5 derniers mois
          </div>
          <LineChart data={caSeries} formatValue={compactEuros} />
          <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
            Par date de contractualisation, pas de reconnaissance comptable — une question pour l&apos;expert-comptable,
            pas une réponse ici.
          </p>
        </div>
        <div className="card">
          <div className="t-stat-label" style={{ marginBottom: 'var(--space-4)' }}>
            Participants inscrits — 5 derniers mois
          </div>
          <BarChart data={participantsSeries} />
          <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
            Par date d&apos;inscription au parcours.
          </p>
        </div>
      </div>

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-2)' }}>
        Alertes ({alerts.length})
      </h2>
      <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
        {dangerCount} critique{dangerCount !== 1 ? 's' : ''} · {warningCount} à surveiller.
      </p>

      {alertGroups.length === 0 ? (
        <div className="card" style={{ marginBottom: 'var(--space-9)' }}>
          <p className="t-body">Aucune alerte — rien ne nécessite d&apos;attention immédiate.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-5)',
            marginBottom: 'var(--space-9)',
            alignItems: 'start',
          }}
        >
          {alertGroups.map((group) => (
            <div key={group.category} className="card card-elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <SeverityDot severity={group.severity} />
                <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                  {group.category}
                </span>
                <span className="t-caption-1">({group.alerts.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {group.alerts.map((a, i) => (
                  <Link
                    key={i}
                    href={a.href}
                    className="t-body-sm"
                    style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}
                  >
                    <span>{a.message}</span>
                    <span aria-hidden style={{ flexShrink: 0 }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Parcours à risque
      </h2>
      {parcoursAtRisk.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun parcours confirmé ou en cours n&apos;a d&apos;alerte ouverte.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {parcoursAtRisk.map((p) => (
            <Link
              key={p.id}
              href={`/parcours/${p.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
            >
              <div>
                <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                  {p.reference}
                </span>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {p.reasons.join(' · ')}
                </p>
              </div>
              <span className="badge badge-danger">
                {p.score} alerte{p.score > 1 ? 's' : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
