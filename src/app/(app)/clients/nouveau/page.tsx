import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { ClientForm } from '@/components/clients/ClientForm'
import { createClientAction } from '@/app/(app)/clients/actions'

export default async function NewClientPage() {
  await requireOperational()
  const assignableUsers = await db.user.findMany({
    where: { isActive: true, roles: { hasSome: ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Clients
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouveau client
      </h1>

      <ClientForm mode="create" action={createClientAction} assignableUsers={assignableUsers} />
    </>
  )
}
