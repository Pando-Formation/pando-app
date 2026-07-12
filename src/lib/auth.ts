/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AUTH — TWO AUDIENCES, TWO MECHANISMS, NEVER CONFLATED
 *
 *  🔴 READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 *  ADMINS      → Google OAuth, restricted to pando-formation.fr
 *  FORMATEURS  → EMAIL MAGIC LINK
 *
 *  Why formateurs cannot use Google OAuth:
 *
 *    PANDO's real formateurs are  sophieschacre@gmail.com
 *                            and  anthony@blueje.com
 *
 *    They are external contractors with their own SIREN and NDA. They have no
 *    PANDO address and never will. A domain-restricted OAuth flow locks them
 *    out of the app FOREVER — and the émargement (slice 8) is THEIR screen.
 *
 *  The obvious implementation — "restrict all sign-in to the company domain" —
 *  silently breaks the single most important surface in the product, and you
 *  will not discover it until slice 8. This file exists to make that mistake
 *  impossible.
 *
 *  Why formateurs get a REAL SESSION and not a one-shot token:
 *
 *    Sophie opens the app in a training room, on her phone, at 08:50 on the
 *    morning of J1, on bad wifi. A single-use token dies on first use. She
 *    needs a persistent, low-friction login: 30 days, "remember this device".
 *
 *  Participants, clients and auditors have NO accounts at all — they get
 *  single-use signed tokens (model: AccessToken). Do not give them sessions.
 *
 *  See: AGENTS.md · PANDO_APP_REFERENCE.md §3
 * ═══════════════════════════════════════════════════════════════════════════
 */

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Nodemailer from 'next-auth/providers/nodemailer'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'

const PANDO_DOMAIN = process.env.PANDO_DOMAIN ?? 'pando-formation.fr'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'database', maxAge: 30 * 24 * 60 * 60 }, // 30 days

  providers: [
    /** ADMINS — Google, domain-restricted. */
    Google({
      allowDangerousEmailAccountLinking: false,
    }),

    /** FORMATEURS — magic link. 15-minute validity, single use. */
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      maxAge: 15 * 60,
    }),
  ],

  callbacks: {
    /**
     * The gate. Two mechanisms, two rules.
     */
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase()
      if (!email) return false

      // ── Google → PANDO domain only ────────────────────────────────────
      if (account?.provider === 'google') {
        return email.endsWith(`@${PANDO_DOMAIN}`)
      }

      // ── Magic link → must already exist as a Formateur ─────────────────
      //
      // 🔴 NOT domain-restricted. Sophie is @gmail.com and that is correct.
      //    The gate is "are you a known formateur", not "are you staff".
      //
      // Anyone can *request* a link; only a known formateur can *use* one.
      if (account?.provider === 'nodemailer') {
        const formateur = await db.formateur.findUnique({
          where: { email },
          select: { id: true, isActive: true, deletedAt: true },
        })
        return Boolean(formateur?.isActive && !formateur.deletedAt)
      }

      return false
    },

    /**
     * 🔴 ROLES ARE A SET, NOT A FIELD.
     *
     * Alexandra is SUPER_ADMIN *and* FORMATEUR — she owns PANDO and she also
     * delivers parcours. She needs the admin dashboard AND the émargement
     * screen for the sessions she runs herself.
     *
     * Permissions are the UNION. Never `user.role === 'ADMIN'`.
     */
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { roles: true, formateurId: true, isActive: true },
      })

      session.user.roles = dbUser?.roles ?? []
      session.user.formateurId = dbUser?.formateurId ?? null
      session.user.id = user.id

      return session
    },
  },

  pages: {
    signIn: '/login',
    verifyRequest: '/login/check-email',
    error: '/login/error',
  },
})
