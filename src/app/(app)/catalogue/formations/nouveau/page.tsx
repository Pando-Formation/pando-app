import { requireSuperAdmin } from '@/lib/authz'
import { getNsfTree } from '@/lib/nsf'
import { FormationForm } from '@/components/catalogue/FormationForm'
import { createFormationAction } from '@/app/(app)/catalogue/formations/actions'

export default async function NewFormationPage() {
  await requireSuperAdmin()
  const nsfTree = await getNsfTree()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Catalogue
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouvelle formation
      </h1>

      <FormationForm nsfTree={nsfTree} mode="create" action={createFormationAction} />
    </>
  )
}
