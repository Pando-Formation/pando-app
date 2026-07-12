import Link from 'next/link'
import { requireSession } from '@/lib/authz'
import { euros } from '@/lib/money'
import { getAlerts, getParcoursAtRisk, getCaTotal, getMargin } from '@/lib/pilotage'

/**
 * 🔴 THE HOME SCREEN IS A RISK RADAR, NOT A VANITY DASHBOARD.
 * The money card is the SMALLEST thing here. The alerts are the BIGGEST.
 * Every alert is one click from the thing that needs doing.
 */
export default async function Home() {
  const session = await requireSession()
  const [alerts, ca, margin] = await Promise.all([getAlerts(), getCaTotal(), getMargin()])
  const parcoursAtRisk = await getParcoursAtRisk(alerts)

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
        Alertes ({alerts.length})
      </h2>

      {alerts.length === 0 ? (
        <div className="card" style={{ marginBottom: 'var(--space-9)' }}>
          <p className="t-body">Aucune alerte — rien ne nécessite d&apos;attention immédiate.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-9)' }}>
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="card card-elevated"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}
            >
              <div>
                <span className={`badge ${a.severity === 'danger' ? 'badge-danger' : 'badge-warning'}`}>{a.category}</span>
                <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
                  {a.message}
                </p>
              </div>
              <span className="t-caption-1">→</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Parcours à risque
      </h2>
      {parcoursAtRisk.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-9)' }}>
          Aucun parcours confirmé ou en cours n&apos;a d&apos;alerte ouverte.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-9)' }}>
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
              <span className="badge badge-danger">{p.score} alerte{p.score > 1 ? 's' : ''}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
        Résumé financier
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)', maxWidth: 640 }}>
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
      <p className="t-caption-1" style={{ marginTop: 'var(--space-4)' }}>
        {dangerCount} alerte{dangerCount !== 1 ? 's' : ''} critique{dangerCount !== 1 ? 's' : ''} · {warningCount} à
        surveiller. La marge compte le coût réel des formateurs externes (TTC, TVA absorbée) — un formateur interne
        n&apos;est jamais compté comme un coût.
      </p>
    </>
  )
}
