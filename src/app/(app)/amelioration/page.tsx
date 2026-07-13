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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHero } from '@/components/page-hero'

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
      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          Amélioration continue
        </div>
        <h1 className="t-title-2">Réclamations · Actions · Veille</h1>
      </PageHero>

      <section style={{ marginBottom: 'var(--space-10)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-3)' }}>
          Réclamations ({reclamations.length})
        </h2>
        <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
          Objectif : moins d&apos;une minute pour tracer une réclamation.
        </p>
        <Card style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
          <CardHeader>
            <CardTitle>Nouvelle réclamation</CardTitle>
          </CardHeader>
          <CardContent>
            <ReclamationForm action={createReclamationAction} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {reclamations.map((r) => (
            <Card key={r.id}>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{RECLAMATION_SOURCE_LABELS[r.source] ?? r.source}</Badge>
                  <span className="t-body-sm">{new Date(r.receivedAt).toLocaleDateString('fr-FR')}</span>
                  {r.closedAt ? (
                    <Badge variant="success">Clôturée</Badge>
                  ) : r.responseAt ? (
                    <Badge variant="warning">Répondue — ouverte</Badge>
                  ) : (
                    <Badge variant="destructive">Sans réponse</Badge>
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
              </CardContent>
            </Card>
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
        <Card style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
          <CardHeader>
            <CardTitle>Nouvelle action</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createActionAction} owners={ownerOptions} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {actions.map((a) => {
            const overdue = a.status === 'OPEN' && a.dueDate < now
            return (
              <Card key={a.id}>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{ACTION_ORIGIN_LABELS[a.origin] ?? a.origin}</Badge>
                    <span className="t-body-sm">{a.owner.name ?? a.owner.email}</span>
                    <Badge variant={a.status === 'DONE' ? 'success' : overdue ? 'destructive' : 'warning'}>
                      {a.status === 'DONE' ? 'Terminée' : overdue ? 'En retard' : `Échéance ${a.dueDate.toLocaleDateString('fr-FR')}`}
                    </Badge>
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
                </CardContent>
              </Card>
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
        <Card style={{ maxWidth: 640, marginBottom: 'var(--space-6)' }}>
          <CardHeader>
            <CardTitle>Nouvelle entrée de veille</CardTitle>
          </CardHeader>
          <CardContent>
            <VeilleForm action={createVeilleAction} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          {veilleEntries.map((v) => (
            <Card key={v.id}>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{VEILLE_TYPE_LABELS[v.type] ?? v.type}</Badge>
                  <span className="t-body-sm">{new Date(v.date).toLocaleDateString('fr-FR')}</span>
                  <span className="t-caption-1">{v.source}</span>
                </div>
                <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
                  {v.summary}
                </p>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  Ce qui change : {v.soWhat}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}
