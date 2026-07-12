import { notFound } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { getNsfTree } from '@/lib/nsf'
import { centsToEuroInput } from '@/lib/money'
import { FormationForm, type FormationDefaultValues } from '@/components/catalogue/FormationForm'
import { updateFormationAction } from '@/app/(app)/catalogue/formations/actions'

export default async function EditFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireSuperAdmin()

  const [formation, nsfTree] = await Promise.all([db.formation.findUnique({ where: { id } }), getNsfTree()])
  if (!formation) notFound()

  const defaultValues: FormationDefaultValues = {
    internalCode: formation.internalCode,
    title: formation.title,
    subtitle: formation.subtitle,
    brandProgramme: formation.brandProgramme,
    requiresFullCohort: formation.requiresFullCohort,
    intraOnly: formation.intraOnly,
    durationHours: formation.durationHours.toString(),
    durationDays: formation.durationDays.toString(),
    format: formation.format,
    prerequisites: formation.prerequisites,
    targetAudience: formation.targetAudience,
    pedagogicObjectives: formation.pedagogicObjectives,
    methodesPedagogiques: formation.methodesPedagogiques,
    modalitesEvaluation: formation.modalitesEvaluation,
    delaiAcces: formation.delaiAcces,
    accessibilite: formation.accessibilite,
    priceIntraPerDayEuros: centsToEuroInput(formation.priceIntraPerDay),
    priceInterPerPersonEuros: centsToEuroInput(formation.priceInterPerPerson),
    bpfIncluded: formation.bpfIncluded,
    prestationCode: formation.prestationCode,
    specialiteId: formation.specialiteId,
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Catalogue · {formation.internalCode}
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier {formation.title}
      </h1>
      <p className="t-caption-1" style={{ marginBottom: 'var(--space-7)' }}>
        Enregistrer crée une nouvelle version. Les versions précédentes restent intactes.
      </p>

      <FormationForm
        nsfTree={nsfTree}
        mode="edit"
        action={updateFormationAction}
        formationId={formation.id}
        defaultValues={defaultValues}
      />
    </>
  )
}
