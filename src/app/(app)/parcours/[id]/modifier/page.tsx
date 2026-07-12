import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { ParcoursForm, type ParcoursDefaultValues } from '@/components/parcours/ParcoursForm'
import { updateParcoursAction } from '@/app/(app)/parcours/actions'
import type { FormationSnapshot } from '@/lib/formation'

export default async function EditParcoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const [parcours, clients] = await Promise.all([
    db.parcours.findUnique({ where: { id }, include: { formationVersion: true } }),
    db.client.findMany({ where: { deletedAt: null }, orderBy: { companyName: 'asc' } }),
  ])
  if (!parcours) notFound()

  const snapshot = parcours.formationVersion.snapshot as unknown as FormationSnapshot

  const defaultValues: ParcoursDefaultValues = {
    reference: parcours.reference,
    formationId: parcours.formationVersion.formationId,
    formationTitle: `${snapshot.title} (v${parcours.formationVersion.version})`,
    pandoRole: parcours.pandoRole,
    track: parcours.track,
    status: parcours.status,
    clientId: parcours.clientId,
    beneficiaireId: parcours.beneficiaireId,
    donneurOrdreId: parcours.donneurOrdreId,
    minParticipants: parcours.minParticipants?.toString() ?? '',
    maxParticipants: parcours.maxParticipants?.toString() ?? '',
    delaiReglement: parcours.delaiReglement.toString(),
    cancellationReason: parcours.cancellationReason ?? '',
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Parcours
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier {parcours.reference}
      </h1>

      <ParcoursForm
        mode="edit"
        action={updateParcoursAction}
        parcoursId={parcours.id}
        defaultValues={defaultValues}
        formations={[]}
        clients={clients.map((c) => ({ id: c.id, label: c.companyName }))}
      />
    </>
  )
}
