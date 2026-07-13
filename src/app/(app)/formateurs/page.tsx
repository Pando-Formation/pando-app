import { requireAdmin } from '@/lib/authz'
import { db } from '@/lib/db'
import { formateurDayCost } from '@/lib/money'
import { competenceStatus } from '@/lib/formateur'
import { PageHero } from '@/components/page-hero'
import { FormateursTable, type FormateurRow } from '@/components/formateurs/FormateursTable'

export default async function FormateursListPage() {
  await requireAdmin()

  const formateurs = await db.formateur.findMany({
    where: { deletedAt: null },
    orderBy: { lastName: 'asc' },
    include: { competences: true },
  })

  return (
    <>
      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          Formateurs
        </div>
        <h1 className="t-title-2">Formateurs</h1>
      </PageHero>

      <FormateursTable
        data={formateurs.map((f): FormateurRow => {
          const dayCost = formateurDayCost({
            contractType: f.contractType,
            tarifJour: f.tarifJour,
            tvaRate: Number(f.tvaRate),
            forfaitDeplacement: f.forfaitDeplacement,
          })
          const hasExpiryWarning = f.competences.some((c) => {
            const status = competenceStatus(c.expiresAt)
            return status === 'expired' || status === 'expiring_soon'
          })

          return {
            id: f.id,
            firstName: f.firstName,
            lastName: f.lastName,
            email: f.email,
            contractType: f.contractType,
            dayCost,
            hasExpiryWarning,
          }
        })}
      />
    </>
  )
}
