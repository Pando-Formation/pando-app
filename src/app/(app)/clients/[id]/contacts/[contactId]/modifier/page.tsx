import { notFound } from 'next/navigation'
import { requireOperational } from '@/lib/authz'
import { db } from '@/lib/db'
import { ContactForm, type ContactDefaultValues } from '@/components/clients/ContactForm'
import { updateContactAction } from '@/app/(app)/clients/actions'

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>
}) {
  const { id, contactId } = await params
  await requireOperational()

  const [client, contact] = await Promise.all([
    db.client.findUnique({ where: { id }, select: { id: true, companyName: true } }),
    db.clientContact.findUnique({ where: { id: contactId } }),
  ])
  if (!client || !contact || contact.clientId !== client.id) notFound()

  const defaultValues: ContactDefaultValues = {
    roles: contact.roles,
    civilite: contact.civilite,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fonction: contact.fonction,
    email: contact.email,
    phone: contact.phone,
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Clients · {client.companyName}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier {contact.firstName} {contact.lastName}
      </h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <ContactForm clientId={client.id} contactId={contact.id} action={updateContactAction} defaultValues={defaultValues} />
      </div>
    </>
  )
}
