'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireSession, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { attendanceInputSchema } from '@/lib/validation/attendance'
import { markAttendance, counterSignAttendance } from '@/lib/attendance'

export type AttendanceActionState = {
  formError?: string
  fieldErrors?: Record<string, string[]>
} | null

/**
 * Presence-taking isn't SUPER_ADMIN/ADMIN-only — Sophie and Anthony sign
 * their own séquences in. Allowed: SUPER_ADMIN/ADMIN (any séquence), or the
 * FORMATEUR actually assigned to THIS séquence.
 */
async function requireAttendanceWriteAccess(sequenceId: string) {
  const session = await requireSession()
  if (hasRole(session, 'SUPER_ADMIN') || hasRole(session, 'ADMIN')) return session

  const sequence = await db.sequence.findUnique({ where: { id: sequenceId }, select: { formateurId: true } })
  if (hasRole(session, 'FORMATEUR') && sequence?.formateurId && sequence.formateurId === session.user.formateurId) {
    return session
  }
  throw new Error("Vous n'êtes pas le formateur assigné à cette séquence.")
}

function getSignerIp(headerList: Headers): string | null {
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

export async function markAttendanceAction(
  _prevState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const sequenceId = String(formData.get('sequenceId') ?? '')
  const participantId = String(formData.get('participantId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  const demiJournee = String(formData.get('demiJournee') ?? '') as 'MATIN' | 'APRES_MIDI'

  try {
    await requireAttendanceWriteAccess(sequenceId)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Accès refusé.' }
  }

  const parsed = attendanceInputSchema.safeParse({
    status: String(formData.get('status') ?? 'PRESENT'),
    justification: formData.get('justification') ? String(formData.get('justification')) : null,
    signatureName: formData.get('signatureName') ? String(formData.get('signatureName')) : null,
    documentId: formData.get('documentId') ? String(formData.get('documentId')) : null,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  try {
    const ip = getSignerIp(await headers())
    await markAttendance(sequenceId, participantId, demiJournee, parsed.data, ip)
  } catch (e) {
    return { formError: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }

  revalidatePath(`/parcours/${parcoursId}/sequences/${sequenceId}/emargement`)
  return null
}

export async function counterSignAttendanceAction(formData: FormData) {
  const attendanceId = String(formData.get('attendanceId') ?? '')
  const sequenceId = String(formData.get('sequenceId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!attendanceId) return

  await requireAttendanceWriteAccess(sequenceId)
  await counterSignAttendance(attendanceId)
  revalidatePath(`/parcours/${parcoursId}/sequences/${sequenceId}/emargement`)
}
