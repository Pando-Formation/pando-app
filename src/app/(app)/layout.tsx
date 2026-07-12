import { requireSession } from '@/lib/authz'
import { AppShell } from '@/components/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <AppShell user={{ name: session.user.name ?? null, email: session.user.email ?? '' }}>
      {children}
    </AppShell>
  )
}
