import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { PageHero } from '@/components/page-hero'
import { ClientsTable, type ClientRow } from '@/components/clients/ClientsTable'

export default async function ClientsListPage() {
  const session = await requireSession()
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) =>
    hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIAL'),
  )

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { companyName: 'asc' },
    include: { _count: { select: { contacts: true } } },
  })

  return (
    <>
      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          Clients
        </div>
        <h1 className="t-title-2">Clients</h1>
      </PageHero>

      <ClientsTable
        canWrite={canWrite}
        data={clients.map(
          (c): ClientRow => ({
            id: c.id,
            companyName: c.companyName,
            status: c.status,
            isPublicSector: c.isPublicSector,
            siret: c.siret,
            city: c.city,
            contactsCount: c._count.contacts,
          }),
        )}
      />
    </>
  )
}
