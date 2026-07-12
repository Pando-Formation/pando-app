import { db } from '@/lib/db'

/**
 * The full NSF taxonomy (~511 rows total) as flat arrays. Small enough to
 * load once and let the client cascade-filter in memory — no per-step
 * round trip for the picker.
 *
 * 🔴 `champs` is a FUNCTION axis, not a topic axis — 315m/315n/315p/315r are
 * the SAME specialite topic in the SAME groupe, differing only by champs.
 */
export type NsfTree = Awaited<ReturnType<typeof getNsfTree>>

export async function getNsfTree() {
  const [grandDomaines, domaines, groupes, champs, specialites] = await Promise.all([
    db.nsfGrandDomaine.findMany({ orderBy: { code: 'asc' } }),
    db.nsfDomaine.findMany({ orderBy: { code: 'asc' } }),
    db.nsfGroupe.findMany({ orderBy: { code: 'asc' } }),
    db.nsfChamps.findMany({ orderBy: { code: 'asc' } }),
    db.nsfSpecialite.findMany({ orderBy: { code: 'asc' } }),
  ])

  return { grandDomaines, domaines, groupes, champs, specialites }
}
