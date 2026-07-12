import type { Role } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      /** 🔴 A SET. Alexandra is SUPER_ADMIN *and* FORMATEUR. Permissions are the union. */
      roles: Role[]
      formateurId: string | null
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}
