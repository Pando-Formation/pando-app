import { requireSession } from '@/lib/authz'

export default async function Home() {
  const session = await requireSession()

  return (
    <>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        PANDO
      </div>
      <h1 className="t-title-1" style={{ marginBottom: 'var(--space-4)' }}>
        Bonjour {session.user.name?.split(' ')[0]}.
      </h1>
      <p className="t-intro" style={{ maxWidth: 560 }}>
        Slice 1 — catalogue. Formations, versionnées, avec programme généré.
      </p>
    </>
  )
}
