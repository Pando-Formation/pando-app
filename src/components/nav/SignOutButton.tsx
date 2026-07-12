import { signOutAction } from '@/lib/actions/sign-out'

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="btn btn-sm btn-ghost">
        Se déconnecter
      </button>
    </form>
  )
}
