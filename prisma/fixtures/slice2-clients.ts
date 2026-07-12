/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SLICE 2 — CLIENTS & CONTACTS VERIFICATION
 *
 *  Exercises the real domain logic directly: SIRET/postcode format
 *  rejection (both at the validation layer AND the DB CHECK constraint —
 *  a bypass of one must still be caught by the other), the SIRENE response
 *  parser (pure, no network — no INSEE_SIRENE_TOKEN needed to verify the
 *  parsing logic), isPublicSector derivation, and multi-role contacts.
 *
 *  Deliberately separate from real-data.ts (frozen Slice-0 gate). Own
 *  cleanup, scoped to companyName prefix "VERIFY-", never touches other
 *  fixtures' data.
 *
 *  Run:     npm run verify:slice2
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '@/lib/db'
import { clientInputSchema, clientContactInputSchema } from '@/lib/validation/client'
import { createClient, addClientContact, deriveIsPublicSector } from '@/lib/client'
import { parseSireneEtablissement } from '@/lib/sirene'
import { hasRole } from '@/lib/authz'
import type { Session } from 'next-auth'

const log = {
  head: (s: string) => console.log(`\n─── ${s} ───\n`),
  ok: (s: string) => console.log(`  ✓ ${s}`),
  fail: (s: string) => console.log(`  ✗ ${s}`),
}

let total = 0
let failures = 0
function assert(condition: boolean, message: string) {
  total++
  if (condition) log.ok(message)
  else {
    log.fail(message)
    failures++
  }
}

async function cleanup() {
  await db.clientContact.deleteMany({ where: { client: { companyName: { startsWith: 'VERIFY-' } } } })
  await db.client.deleteMany({ where: { companyName: { startsWith: 'VERIFY-' } } })
}

function fakeSession(roles: Session['user']['roles']): Session {
  return {
    user: { id: 'x', roles, formateurId: null, email: 'x@example.com' },
    expires: new Date(Date.now() + 1000).toISOString(),
  } as Session
}

async function main() {
  log.head('SLICE 2 — CLIENTS & CONTACTS VERIFICATION')
  await cleanup()

  // ── 1. SIRET/postcode format — rejected at the validation layer ──────────
  const badSiret = clientInputSchema.safeParse({
    companyName: 'VERIFY-Bad SIRET',
    siret: '5.0837292700014E13', // the exact live-sheet corruption
  })
  assert(!badSiret.success, 'SIRET as a float string — rejected by validation with an explanatory message')
  assert(
    Boolean(badSiret.success === false && badSiret.error.flatten().fieldErrors.siret?.[0]),
    'SIRET rejection carries a human-readable message (not a bare regex failure)',
  )

  const badPostcode = clientInputSchema.safeParse({ companyName: 'VERIFY-Bad postcode', postalCode: '9200' })
  assert(!badPostcode.success, 'Postcode 9200 (leading zero lost) — rejected by validation')

  const goodPostcode = clientInputSchema.safeParse({ companyName: 'VERIFY-Good postcode', postalCode: '92000' })
  assert(goodPostcode.success, 'Postcode 92000 — accepted by validation')

  // ── 2. DB CHECK constraint — the safety net if validation is ever bypassed ─
  let dbRejectedBadSiret = false
  try {
    await db.client.create({ data: { companyName: 'VERIFY-Bypass', siret: '5083729270001' } }) // 13 digits
  } catch {
    dbRejectedBadSiret = true
  }
  assert(dbRejectedBadSiret, 'A malformed SIRET reaching Prisma directly is still rejected by the DB CHECK constraint')

  // ── 3. isPublicSector derivation — catégorie juridique 7xxx ───────────────
  assert(deriveIsPublicSector('7210') === true, "Catégorie juridique 7210 (commune) → isPublicSector true")
  assert(deriveIsPublicSector('7346') === true, 'Any 7xxx category → isPublicSector true')
  assert(deriveIsPublicSector('5710') === false, 'A private-sector category (5xxx) → isPublicSector false')
  assert(deriveIsPublicSector(null) === false, 'No catégorie juridique on file → isPublicSector false, not a crash')

  // ── 4. SIRENE response parser — pure, no network/token needed ────────────
  const mockSireneResponse = {
    etablissement: {
      siret: '13002526500013',
      uniteLegale: {
        denominationUniteLegale: 'MAIRIE DE BORDEAUX',
        categorieJuridiqueUniteLegale: '7210',
      },
      adresseEtablissement: {
        numeroVoieEtablissement: '29',
        typeVoieEtablissement: 'RUE',
        libelleVoieEtablissement: 'FERNAND MARIN',
        codePostalEtablissement: '33000',
        libelleCommuneEtablissement: 'BORDEAUX',
      },
      periodesEtablissement: [
        { dateFin: null, activitePrincipaleEtablissement: '84.11Z', nomenclatureActivitePrincipaleEtablissement: 'NAFRev2' },
      ],
    },
  }
  const parsed = parseSireneEtablissement(mockSireneResponse)
  assert(parsed.companyName === 'MAIRIE DE BORDEAUX', 'SIRENE parser extracts denominationUniteLegale')
  assert(parsed.postalCode === '33000' && parsed.city === 'BORDEAUX', 'SIRENE parser extracts postal code + city')
  assert(parsed.categorieJuridique === '7210', 'SIRENE parser extracts catégorie juridique')
  assert(parsed.nafCode === '84.11Z' && parsed.nafNomenclature === 'REV2', 'SIRENE parser extracts NAF + nomenclature')
  assert(deriveIsPublicSector(parsed.categorieJuridique) === true, 'A SIRENE-sourced public client is auto-flagged isPublicSector')

  // ── 5. Two contacts, distinct roles — the flattened-fields trap ──────────
  const client = await createClient(
    clientInputSchema.parse({ companyName: 'VERIFY-Le 104', siret: '78667542400010', postalCode: '75019', city: 'PARIS' }),
  )
  const marion = await addClientContact(
    client.id,
    clientContactInputSchema.parse({
      roles: ['ADMINISTRATIF'],
      firstName: 'Marion',
      lastName: 'Test',
      email: 'marion@verify.test',
    }),
  )
  const benedicte = await addClientContact(
    client.id,
    clientContactInputSchema.parse({
      roles: ['SIGNATAIRE'],
      firstName: 'Bénédicte',
      lastName: 'Test',
      email: 'benedicte@verify.test',
    }),
  )
  const contacts = await db.clientContact.findMany({ where: { clientId: client.id } })
  assert(contacts.length === 2, 'Client has two independent contacts, not two flattened fields')
  assert(
    marion.roles.includes('ADMINISTRATIF') && !marion.roles.includes('SIGNATAIRE'),
    'Marion — ADMINISTRATIF only',
  )
  assert(
    benedicte.roles.includes('SIGNATAIRE') && !benedicte.roles.includes('ADMINISTRATIF'),
    'Bénédicte — SIGNATAIRE only',
  )

  // ── 6. A contact may hold several roles at once ───────────────────────────
  const multiRole = clientContactInputSchema.parse({
    roles: ['PRINCIPAL', 'SIGNATAIRE'],
    firstName: 'Multi',
    lastName: 'Role',
    email: 'multi@verify.test',
  })
  const multi = await addClientContact(client.id, multiRole)
  assert(multi.roles.length === 2, 'A contact can hold multiple roles simultaneously')

  // ── 7. Role-SET semantics for the operational guard ───────────────────────
  assert(hasRole(fakeSession(['COMMERCIAL']), 'COMMERCIAL'), 'COMMERCIAL role recognized via .includes()')
  assert(!hasRole(fakeSession(['FORMATEUR']), 'ADMIN'), 'FORMATEUR-only session does not carry ADMIN')

  await cleanup()

  console.log(`\n  ${total - failures}/${total} checks passed.\n`)
  if (failures > 0) {
    console.error(`  🔴 SLICE 2 IS NOT DONE. ${failures} check(s) failed.\n`)
    process.exit(1)
  }
  console.log('  ✅ Slice 2 clients & contacts verification passed.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
