import { requireAdmin } from '@/lib/authz'
import { FormateurForm } from '@/components/formateurs/FormateurForm'
import { createFormateurAction } from '@/app/(app)/formateurs/actions'

export default async function NewFormateurPage() {
  await requireAdmin()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        Formateurs
      </div>
      <h1 className="t-title-2" style={{ marginBottom: 'var(--space-8)' }}>
        Nouveau formateur
      </h1>

      <FormateurForm mode="create" action={createFormateurAction} />
    </>
  )
}
