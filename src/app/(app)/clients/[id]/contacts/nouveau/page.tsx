import { notFound } from 'next/navigation'
import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { ContactForm } from '@/components/clients/ContactForm'
import { addContactAction } from '@/app/(app)/clients/actions'

export default async function NewContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireOperational()

  const client = await db.client.findUnique({ where: { id }, select: { id: true, companyName: true } })
  if (!client) notFound()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Clients · {client.companyName}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouveau contact
      </h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <ContactForm clientId={client.id} action={addContactAction} />
      </div>
    </>
  )
}
