import { notFound } from 'next/navigation'
import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { ClientForm, type ClientDefaultValues } from '@/components/clients/ClientForm'
import { updateClientAction } from '@/app/(app)/clients/actions'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireOperational()

  const [client, assignableUsers] = await Promise.all([
    db.client.findUnique({ where: { id } }),
    db.user.findMany({
      where: { isActive: true, roles: { hasSome: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])
  if (!client) notFound()

  const defaultValues: ClientDefaultValues = {
    companyName: client.companyName,
    siret: client.siret ?? '',
    siren: client.siren ?? '',
    isPublicSector: client.isPublicSector,
    categorieJuridique: client.categorieJuridique ?? '',
    nafRev2: client.nafRev2 ?? '',
    naf2025: client.naf2025 ?? '',
    nafSource: client.nafSource,
    address: client.address ?? '',
    postalCode: client.postalCode ?? '',
    city: client.city ?? '',
    region: client.region ?? '',
    status: client.status,
    origin: client.origin,
    assignedToId: client.assignedToId ?? '',
    comments: client.comments ?? '',
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Clients
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier {client.companyName}
      </h1>

      <ClientForm
        mode="edit"
        action={updateClientAction}
        clientId={client.id}
        defaultValues={defaultValues}
        assignableUsers={assignableUsers}
      />
    </>
  )
}
