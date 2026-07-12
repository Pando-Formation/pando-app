import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import type { Role } from '@prisma/client'

/** Any signed-in user. Redirects to /login otherwise. */
export async function requireSession(): Promise<Session> {
  const session = await auth()
  if (!session) redirect('/login')
  return session
}

/**
 * 🔴 Roles are a SET on User.roles — always `.includes()`, never `===`.
 * Alexandra is SUPER_ADMIN *and* FORMATEUR; permissions are the union.
 */
export function hasRole(session: Session, role: Role): boolean {
  return session.user.roles.includes(role)
}

/** SUPER_ADMIN only — catalogue writes, templates, user management. */
export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireSession()
  if (!hasRole(session, 'SUPER_ADMIN')) redirect('/')
  return session
}

/**
 * Day-to-day operational roles — clients, demandes, parcours, participants,
 * documents, invoicing. Per PANDO_APP_REFERENCE.md's role table: ADMIN has
 * this everywhere, COMMERCIAL has it for clients/demandes/devis (parcours
 * stays read-only for COMMERCIAL — not enforced by this guard, narrower
 * checks belong at the call site once parcours exists). FORMATEUR does not.
 */
export async function requireOperational(): Promise<Session> {
  const session = await requireSession()
  if (!['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) => hasRole(session, r as Role))) redirect('/')
  return session
}
