import Link from 'next/link'
import { requireSession } from '@/lib/authz'
import { SignOutButton } from '@/components/nav/SignOutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 'var(--app-nav-width)',
          flexShrink: 0,
          borderRight: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-7) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="t-overline" style={{ marginBottom: 'var(--space-9)' }}>
          PANDO
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1 }}>
          <Link href="/" className="t-nav-m" style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-3) 0' }}>
            Tableau de bord
          </Link>
          <Link
            href="/catalogue/formations"
            className="t-nav-m"
            style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-3) 0' }}
          >
            Catalogue
          </Link>
          <Link
            href="/clients"
            className="t-nav-m"
            style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-3) 0' }}
          >
            Clients
          </Link>
          <Link
            href="/formateurs"
            className="t-nav-m"
            style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-3) 0' }}
          >
            Formateurs
          </Link>
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-5)' }}>
          <div className="t-caption-1" style={{ marginBottom: 'var(--space-3)' }}>
            {session.user.name ?? session.user.email}
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main style={{ flex: 1, padding: 'var(--space-10)' }}>{children}</main>
    </div>
  )
}
