import { db } from '@/lib/db'
import type { AttendanceInput } from '@/lib/validation/attendance'

/**
 * 🔴 THE HARD ONE — Slice 8, scoped down for the pre-demo build. What's
 * real here: the state machine, the recomputed hoursAttended, the CHECK 6/7
 * enforcement (both at zod and, unconditionally, at the DB layer from
 * Slice 0). What's NOT built: the offline PWA (service worker + IndexedDB
 * queue + sync-on-reconnect) and true drawn-signature capture. `signatureName`
 * is a typed name standing in for a canvas signature; `signedIp` is captured
 * for real from the request. See the "demo scope" memory for why.
 *
 * The paper fallback is NOT removed even in this scoped build — a dead
 * router must never be the reason a session can't be recorded. It just
 * doesn't yet have a scan-upload flow: PAPER proof re-uses an existing
 * Document (e.g. the séquence's printed convocation) as the scanned sheet.
 */
export async function markAttendance(
  sequenceId: string,
  participantId: string,
  demiJournee: 'MATIN' | 'APRES_MIDI',
  input: AttendanceInput,
  signerIp: string | null,
) {
  const sequence = await db.sequence.findUniqueOrThrow({ where: { id: sequenceId } })

  if (input.status === 'PRESENT' && sequence.preuveType === 'PAPER' && !input.documentId) {
    throw new Error('Un document scanné est requis pour une preuve papier.')
  }

  const now = new Date()
  const proofFields =
    input.status !== 'PRESENT'
      ? { signedAt: null, signedIp: null, connectedAt: null, completedAt: null, documentId: null }
      : sequence.preuveType === 'SIGNATURE'
        ? { signedAt: now, signedIp: signerIp, signatureData: input.signatureName ?? null }
        : sequence.preuveType === 'CONNEXION'
          ? { connectedAt: now }
          : sequence.preuveType === 'COMPLETION'
            ? { completedAt: now }
            : sequence.preuveType === 'PAPER'
              ? { documentId: input.documentId }
              : {} // COMPTE_RENDU — coaching proof is recorded on CompteRendu, out of this slice's scope

  const attendance = await db.attendance.upsert({
    where: { sequenceId_participantId_demiJournee: { sequenceId, participantId, demiJournee } },
    create: {
      sequenceId,
      participantId,
      demiJournee,
      status: input.status,
      preuveType: sequence.preuveType,
      justification: input.status !== 'PRESENT' ? (input.justification ?? null) : null,
      ...proofFields,
    },
    update: {
      status: input.status,
      justification: input.status !== 'PRESENT' ? (input.justification ?? null) : null,
      formateurSignedAt: null, // a status change invalidates any prior counter-signature
      ...proofFields,
    },
  })

  await recomputeHoursAttended(sequence.parcoursId, participantId)
  return attendance
}

/** 🔴 Both parties sign. The formateur's counter-signature is a separate act from the participant's. */
export async function counterSignAttendance(attendanceId: string) {
  return db.attendance.update({ where: { id: attendanceId }, data: { formateurSignedAt: new Date() } })
}

/**
 * 🔴 DERIVED — real hours, never contracted hours. A participant who misses
 * one demi-journée of a two-demi-journée day gets credit for the other
 * half only. Each demi-journée contributes heures ÷ demiJournees.length.
 */
export async function recomputeHoursAttended(parcoursId: string, participantId: string) {
  const presentRows = await db.attendance.findMany({
    where: { participantId, status: 'PRESENT', sequence: { parcoursId } },
    include: { sequence: { select: { heures: true, demiJournees: true } } },
  })
  const totalHours = presentRows.reduce((sum, row) => {
    const perDemiJournee = Number(row.sequence.heures) / row.sequence.demiJournees.length
    return sum + perDemiJournee
  }, 0)

  return db.parcoursParticipant.update({
    where: { parcoursId_participantId: { parcoursId, participantId } },
    data: { hoursAttended: totalHours },
  })
}
