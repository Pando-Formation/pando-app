import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { RECLAMATION_SOURCE_LABELS, ACTION_ORIGIN_LABELS, VEILLE_TYPE_LABELS } from '@/lib/amelioration-labels'
import {
  createReclamationAction,
  respondReclamationAction,
  createActionAction,
  resolveActionAction,
  createVeilleAction,
} from '@/app/(app)/amelioration/actions'
import { ReclamationForm } from '@/components/amelioration/ReclamationForm'
import { ActionForm } from '@/components/amelioration/ActionForm'
import { VeilleForm } from '@/components/amelioration/VeilleForm'

export default async function AmeliorationPage() {
  await requireOperational()

  const [reclamations, actions, veilleEntries, owners] = await Promise.all([
    db.reclamation.findMany({ orderBy: { receivedAt: 'desc' }, take: 20 }),
    db.actionAmelioration.findMany({ orderBy: { dueDate: 'asc' }, include: { owner: { select: { name: true, email: true } } } }),
    db.veille.findMany({ orderBy: { date: 'desc' }, take: 20, include: { author: { select: { name: true, email: true } } } }),
    db.user.findMany({ where: { roles: { hasSome: ['SUPER_ADMIN', 'ADMIN'] } } }),
  ])

  const ownerOptions = owners.map((o) => ({ id: o.id, label: o.name ?? o.email ?? o.id }))
  const now = new Date()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Amélioration continue
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Réclamations · Actions · Veille
      </h1>

      <section style={{ marginBottom: 'var(--space-10)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-3)' }}>
          Réclamations ({reclamations.length})
        </h2>
        <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
          Objectif : moins d&apos;une minute pour tracer une réclamation.
        </p>
        <div className="card" style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
          <ReclamationForm action={createReclamationAction} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {reclamations.map((r) => (
            <div key={r.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="badge badge-neutral">{RECLAMATION_SOURCE_LABELS[r.source] ?? r.source}</span>
                <span className="t-body-sm">{new Date(r.receivedAt).toLocaleDateString('fr-FR')}</span>
                {r.closedAt ? (
                  <span className="badge badge-success">Clôturée</span>
                ) : r.responseAt ? (
                  <span className="badge badge-warning">Répondue — ouverte</span>
                ) : (
                  <span className="badge badge-danger">Sans réponse</span>
                )}
              </div>
              <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
                {r.description}
              </p>
              {r.responseText && (
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  Réponse : {r.responseText}
                </p>
              )}
              {!r.closedAt && (
                <details style={{ marginTop: 'var(--space-3)' }}>
                  <summary className="t-caption-1" style={{ cursor: 'pointer' }}>
                    {r.responseAt ? 'Clôturer' : 'Répondre'}
                  </summary>
                  <form action={respondReclamationAction} style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <input type="hidden" name="id" value={r.id} />
                    <textarea className="input" name="responseText" defaultValue={r.responseText ?? ''} rows={2} placeholder="Réponse apportée" />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <input type="checkbox" name="close" defaultChecked />
                      <span className="t-caption-1">Clôturer la réclamation</span>
                    </label>
                    <button type="submit" className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start' }}>
                      Enregistrer
                    </button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-10)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-3)' }}>
          Actions d&apos;amélioration ({actions.length})
        </h2>
        <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
          Un responsable nommé, une échéance, et un résultat concret — &laquo;&nbsp;actionné&nbsp;&raquo; n&apos;est pas un résultat.
        </p>
        <div className="card" style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
          <ActionForm action={createActionAction} owners={ownerOptions} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {actions.map((a) => {
            const overdue = a.status === 'OPEN' && a.dueDate < now
            return (
              <div key={a.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="badge badge-neutral">{ACTION_ORIGIN_LABELS[a.origin] ?? a.origin}</span>
                  <span className="t-body-sm">{a.owner.name ?? a.owner.email}</span>
                  <span className={`badge ${a.status === 'DONE' ? 'badge-success' : overdue ? 'badge-danger' : 'badge-warning'}`}>
                    {a.status === 'DONE' ? 'Terminée' : overdue ? 'En retard' : `Échéance ${a.dueDate.toLocaleDateString('fr-FR')}`}
                  </span>
                </div>
                <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
                  {a.description}
                </p>
                {a.outcome && (
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                    Résultat : {a.outcome}
                  </p>
                )}
                {a.status === 'OPEN' && (
                  <details style={{ marginTop: 'var(--space-3)' }}>
                    <summary className="t-caption-1" style={{ cursor: 'pointer' }}>
                      Clôturer avec un résultat
                    </summary>
                    <form action={resolveActionAction} style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <input type="hidden" name="id" value={a.id} />
                      <textarea className="input" name="outcome" rows={2} placeholder="Ce qui a concrètement changé" />
                      <button type="submit" className="btn btn-sm btn-primary" style={{ alignSelf: 'flex-start' }}>
                        Enregistrer
                      </button>
                    </form>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-3)' }}>
          Veille ({veilleEntries.length})
        </h2>
        <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
          Objectif : moins de deux minutes. Un log de liens n&apos;est pas de la veille — ce qui change chez PANDO
          l&apos;est.
        </p>
        <div className="card" style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
          <VeilleForm action={createVeilleAction} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {veilleEntries.map((v) => (
            <div key={v.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="badge badge-neutral">{VEILLE_TYPE_LABELS[v.type] ?? v.type}</span>
                <span className="t-body-sm">{new Date(v.date).toLocaleDateString('fr-FR')}</span>
                <span className="t-caption-1">{v.source}</span>
              </div>
              <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
                {v.summary}
              </p>
              <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                Ce qui change : {v.soWhat}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
