import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { centsToEuroInput } from '@/lib/money'
import { FormateurForm, type FormateurDefaultValues } from '@/components/formateurs/FormateurForm'
import { updateFormateurAction } from '@/app/(app)/formateurs/actions'

export default async function EditFormateurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  const formateur = await db.formateur.findUnique({ where: { id } })
  if (!formateur) notFound()

  const defaultValues: FormateurDefaultValues = {
    civilite: formateur.civilite,
    firstName: formateur.firstName,
    lastName: formateur.lastName,
    email: formateur.email,
    phone: formateur.phone ?? '',
    address: formateur.address ?? '',
    postalCode: formateur.postalCode ?? '',
    city: formateur.city ?? '',
    contractType: formateur.contractType,
    siren: formateur.siren ?? '',
    nda: formateur.nda ?? '',
    tvaRate: formateur.tvaRate.toString(),
    tarifJourEuros: centsToEuroInput(formateur.tarifJour),
    forfaitDeplacementEuros: centsToEuroInput(formateur.forfaitDeplacement),
    isQualiopiCertified: formateur.isQualiopiCertified,
    expertises: formateur.expertises,
    yearsFormation: formateur.yearsFormation?.toString() ?? '',
    yearsManagement: formateur.yearsManagement?.toString() ?? '',
    availabilityNotes: formateur.availabilityNotes ?? '',
  }

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Formateurs
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Modifier {formateur.firstName} {formateur.lastName}
      </h1>

      <FormateurForm mode="edit" action={updateFormateurAction} formateurId={formateur.id} defaultValues={defaultValues} />
    </>
  )
}
