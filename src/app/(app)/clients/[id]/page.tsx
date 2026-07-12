import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { CLIENT_STATUS_LABELS, CLIENT_ORIGIN_LABELS, CONTACT_ROLE_LABELS } from '@/lib/client-labels'
import { archiveClientAction, restoreClientAction, toggleContactActiveAction } from '@/app/(app)/clients/actions'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) =>
    hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIAL'),
  )

  const client = await db.client.findUnique({
    where: { id },
    include: { contacts: { orderBy: { createdAt: 'asc' } }, assignedTo: true },
  })
  if (!client) notFound()

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
            Clients · {client.siret ?? 'SIRET non renseigné'}
          </div>
          <h1 className="t-title-2" style={{ marginBottom: 'var(--space-3)' }}>
            {client.companyName}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <span className="badge badge-neutral">{CLIENT_STATUS_LABELS[client.status] ?? client.status}</span>
            {client.isPublicSector && (
              <span className="badge badge-warning">Secteur public — Facture via Chorus Pro</span>
            )}
            {client.deletedAt && <span className="badge badge-danger">Archivé</span>}
          </div>
        </div>

        {canWrite && (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Link href={`/clients/${client.id}/modifier`} className="btn btn-md btn-primary">
              Modifier
            </Link>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-7)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card">
            <h2 className="t-heading" style={{ marginBottom: 'var(--space-4)' }}>
              Détails
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field label="SIRET" value={client.siret ?? '—'} />
              <Field label="SIREN" value={client.siren ?? '—'} />
              <Field label="NAF (rév. 2)" value={client.nafRev2 ?? '—'} />
              <Field label="NAF (2025)" value={client.naf2025 ?? '—'} />
              <Field label="Catégorie juridique" value={client.categorieJuridique ?? '—'} />
              <Field label="Origine" value={CLIENT_ORIGIN_LABELS[client.origin] ?? client.origin} />
              <Field
                label="Adresse"
                value={[client.address, client.postalCode, client.city].filter(Boolean).join(', ') || '—'}
                full
              />
              <Field label="Chargé de compte" value={client.assignedTo?.name ?? client.assignedTo?.email ?? '—'} />
            </dl>
            {client.comments && (
              <>
                <div className="t-caption-1" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-1)' }}>
                  Commentaires
                </div>
                <p className="t-body-sm">{client.comments}</p>
              </>
            )}
          </div>

          {canWrite && (
            <div className="card">
              <form action={client.deletedAt ? restoreClientAction : archiveClientAction}>
                <input type="hidden" name="id" value={client.id} />
                <button type="submit" className={`btn btn-sm ${client.deletedAt ? 'btn-secondary' : 'btn-danger'}`}>
                  {client.deletedAt ? 'Réactiver' : 'Archiver'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 className="t-heading">Contacts</h2>
            {canWrite && (
              <Link href={`/clients/${client.id}/contacts/nouveau`} className="btn btn-sm btn-secondary">
                + Ajouter
              </Link>
            )}
          </div>

          {client.contacts.length === 0 ? (
            <p className="t-caption-1">Aucun contact.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {client.contacts.map((contact) => (
                <div key={contact.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="t-body-sm" style={{ fontWeight: 500 }}>
                        {contact.firstName} {contact.lastName}
                        {!contact.isActive && <span className="t-caption-2"> (inactif)</span>}
                      </div>
                      <div className="t-caption-1">{contact.fonction ?? ''}</div>
                      <div className="t-caption-1">{contact.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {contact.roles.map((r) => (
                        <span key={r} className="badge badge-accent">
                          {CONTACT_ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {canWrite && (
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                      <Link href={`/clients/${client.id}/contacts/${contact.id}/modifier`} className="t-caption-1" style={{ color: 'var(--color-accent-hover)' }}>
                        Modifier
                      </Link>
                      <form action={toggleContactActiveAction}>
                        <input type="hidden" name="id" value={contact.id} />
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="isActive" value={(!contact.isActive).toString()} />
                        <button type="submit" className="t-caption-1" style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}>
                          {contact.isActive ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <div className="t-caption-1" style={{ marginBottom: 'var(--space-1)' }}>
        {label}
      </div>
      <div className="t-body-sm">{value}</div>
    </div>
  )
}
