import { z } from 'zod'

/**
 * 🔴 CHECK 6 at the validation layer — an absence with no justification
 * reads as sloppiness; with one, it reads as a managed event. Mirrors the
 * DB CHECK (attendance_absence_justified).
 *
 * Proof fields are NOT accepted as free input for PRESENT — see
 * src/lib/attendance.ts, which derives them from the séquence's preuveType
 * and the act of submitting the form itself (signedAt/connectedAt/
 * completedAt = now), never from a client-supplied timestamp. This is what
 * keeps CHECK 7 (presence requires proof) meaningful rather than a box a
 * form can check without the underlying fact being true.
 */
export const attendanceInputSchema = z
  .object({
    status: z.enum(['PRESENT', 'ABSENT_JUSTIFIE', 'ABSENT_NON_JUSTIFIE', 'ABANDON']),
    justification: z.string().trim().optional().nullable(),
    signatureName: z.string().trim().optional().nullable(), // stands in for a drawn signature — see AGENTS.md note in attendance.ts
    documentId: z.string().trim().optional().nullable(), // scanned sheet, when preuveType = PAPER
  })
  .superRefine((data, ctx) => {
    if ((data.status === 'ABSENT_JUSTIFIE' || data.status === 'ABSENT_NON_JUSTIFIE') && !data.justification) {
      ctx.addIssue({ code: 'custom', path: ['justification'], message: 'Une justification est requise pour une absence' })
    }
  })

export type AttendanceInput = z.infer<typeof attendanceInputSchema>
