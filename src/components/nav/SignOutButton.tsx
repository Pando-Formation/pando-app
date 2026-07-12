import { signOut } from '@/lib/auth'

async function handleSignOut() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <button type="submit" className="btn btn-sm btn-ghost">
        Se déconnecter
      </button>
    </form>
  )
}
