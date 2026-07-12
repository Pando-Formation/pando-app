/**
 * Custom Auth.js adapter — NOT @auth/prisma-adapter.
 *
 * 🔴 Why custom: the schema deliberately does not use NextAuth's generic
 * model names. `AuthSession` and `MagicLinkToken` exist instead of the
 * default `Session`/`VerificationToken` (see their doc-comments in
 * schema.prisma — this is intentional domain naming, not an oversight).
 * @auth/prisma-adapter hardcodes `prisma.session`/`prisma.verificationToken`
 * and cannot be pointed at renamed models, so it silently breaks against
 * this schema (confirmed: it throws trying to call `db.verificationToken`,
 * which does not exist). This file maps Auth.js's Adapter interface onto
 * the actual models by hand instead of forcing the schema to adopt generic
 * names.
 *
 * `Account` is the one model that genuinely didn't exist at all — OAuth
 * needs somewhere to persist the Google provider link, there's no
 * PANDO-specific shape for that, so it was added as a plain, undocumented
 * (in the domain reference doc) technical model — same tier as
 * AuthSession/MagicLinkToken, which also aren't in PANDO_APP_REFERENCE.md.
 */
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from 'next-auth/adapters'
import type { PrismaClient } from '@prisma/client'

function toAdapterUser(u: {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}): AdapterUser {
  return { id: u.id, email: u.email, name: u.name, image: u.avatarUrl, emailVerified: null }
}

export function pandoAdapter(db: PrismaClient): Adapter {
  return {
    async createUser(user) {
      // 🔴 authMethod has no direct signal in the generic Adapter payload —
      // infer it from the same rule the signIn callback enforces: a known
      // Formateur email can only ever arrive via magic link, everyone else
      // arrives via the domain-restricted Google flow.
      const email = user.email.toLowerCase()
      const formateur = await db.formateur.findUnique({ where: { email }, select: { id: true } })
      const created = await db.user.create({
        data: {
          email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          authMethod: formateur ? 'MAGIC_LINK' : 'GOOGLE_OAUTH',
          formateurId: formateur?.id ?? null,
          // A user only ever reaches createUser via magic link after the
          // signIn callback has already confirmed they're a known, active
          // Formateur (src/lib/auth.ts) — so that's exactly when FORMATEUR
          // is earned. Google sign-ins get no role here; SUPER_ADMIN/ADMIN
          // must be granted explicitly (seed or an admin), never inferred.
          roles: formateur ? ['FORMATEUR'] : [],
        },
      })
      return toAdapterUser(created)
    },

    async getUser(id) {
      const u = await db.user.findUnique({ where: { id } })
      return u ? toAdapterUser(u) : null
    },

    async getUserByEmail(email) {
      const u = await db.user.findUnique({ where: { email: email.toLowerCase() } })
      return u ? toAdapterUser(u) : null
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await db.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      })
      return account ? toAdapterUser(account.user) : null
    },

    async updateUser(user) {
      // emailVerified is part of the Adapter contract but has no column on
      // User — there is nothing to gate on it in this app's authorization
      // logic, so it is accepted and silently dropped rather than persisted.
      const updated = await db.user.update({
        where: { id: user.id },
        data: {
          ...(user.name !== undefined ? { name: user.name } : {}),
          ...(user.email !== undefined ? { email: user.email.toLowerCase() } : {}),
          ...(user.image !== undefined ? { avatarUrl: user.image } : {}),
        },
      })
      return toAdapterUser(updated)
    },

    async deleteUser(id) {
      // 🔴 No hard deletes — AGENTS.md. Soft-delete via the existing field.
      await db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    },

    async linkAccount(account) {
      await db.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state: (account.session_state as string | undefined) ?? null,
        },
      })
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db.account.delete({ where: { provider_providerAccountId: { provider, providerAccountId } } })
    },

    async getAccount(providerAccountId, provider) {
      const account = await db.account.findFirst({ where: { providerAccountId, provider } })
      return account as AdapterAccount | null
    },

    async createSession(session) {
      const created = await db.authSession.create({ data: session })
      return created as AdapterSession
    },

    async getSessionAndUser(sessionToken) {
      const record = await db.authSession.findUnique({ where: { sessionToken }, include: { user: true } })
      if (!record) return null
      const { user, ...session } = record
      return { session: session as AdapterSession, user: toAdapterUser(user) }
    },

    async updateSession(session) {
      const updated = await db.authSession.update({
        where: { sessionToken: session.sessionToken },
        data: session,
      })
      return updated as AdapterSession
    },

    async deleteSession(sessionToken) {
      await db.authSession.delete({ where: { sessionToken } }).catch(() => null)
    },

    async createVerificationToken({ identifier, token, expires }): Promise<VerificationToken> {
      const created = await db.magicLinkToken.create({
        data: { email: identifier.toLowerCase(), token, expiresAt: expires },
      })
      return { identifier: created.email, token: created.token, expires: created.expiresAt }
    },

    async useVerificationToken({ identifier, token }) {
      const record = await db.magicLinkToken.findUnique({ where: { token } })
      if (!record || record.usedAt || record.email !== identifier.toLowerCase()) return null

      // Soft-consume — mark used rather than delete, preserving the audit
      // trail (the model already has `usedAt` for exactly this).
      await db.magicLinkToken.update({ where: { token }, data: { usedAt: new Date() } })
      return { identifier: record.email, token: record.token, expires: record.expiresAt }
    },
  }
}
