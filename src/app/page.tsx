import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main style={{ padding: 'var(--space-10)' }}>
      <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
        PANDO
      </div>
      <h1 className="t-title-1" style={{ marginBottom: 'var(--space-4)' }}>
        Bonjour {session.user.name?.split(' ')[0]}.
      </h1>
      <p className="t-intro" style={{ maxWidth: 560 }}>
        Slice 0 — foundation. Le socle est en place&nbsp;: base de données,
        contraintes, authentification, design system.
      </p>
    </main>
  )
}
