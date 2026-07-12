/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PANDO — SEED
 *
 *  Reference data only. Never business data.
 *  Idempotent: safe to re-run.
 *
 *    npm run db:seed
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const db = new PrismaClient()
const SEED_DIR = join(process.cwd(), 'prisma', 'seed')

function csv(file: string): Record<string, string>[] {
  return parse(readFileSync(join(SEED_DIR, file), 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })
}

// ─────────────────────────────────────────────────────────────────────────
//  1 · PANDO itself
//
//  🔴 Organisation.nda is PANDO'S NDA — 11950745495.
//     The live spreadsheet stores it in a column called `NDA_formateur`,
//     conflating the ORGANISATION's déclaration d'activité with an external
//     SUBCONTRACTOR's. They are not the same field, and an auditor will notice.
// ─────────────────────────────────────────────────────────────────────────
async function seedOrganisation() {
  const existing = await db.organisation.findFirst()
  if (existing) return console.log('  · Organisation — already seeded')

  await db.organisation.create({
    data: {
      name: 'PANDO',
      siret: '00000000000000', // ⚠️ TODO: PANDO's real SIRET
      nda: '11950745495',
      postalCode: '95230',
      city: 'SOISY-SOUS-MONTMORENCY',
      vatExempt: true,
      vatExemptCode: 'art. 261-4-4° a CGI',
    },
  })
  console.log('  ✓ Organisation — PANDO (NDA 11950745495)')
}

// ─────────────────────────────────────────────────────────────────────────
//  2 · NSF — the taxonomy the BPF is built on
//
//  4 grands domaines → 17 domaines → 93 groupes → 380 spécialités
//                                      × 17 champs
//
//  🔴 `champs` is a FUNCTION axis, not a topic axis.
//     315m / 315n / 315p / 315r are the SAME subject (ressources humaines)
//     with four different functions. The picker MUST cascade — a flat
//     380-item dropdown gets mis-picked once and then poisons every BPF.
// ─────────────────────────────────────────────────────────────────────────
async function seedNsf() {
  for (const r of csv('nsf_grand_domaine.csv')) {
    await db.nsfGrandDomaine.upsert({
      where: { code: r.code! },
      update: { titre: r.titre! },
      create: { code: r.code!, titre: r.titre! },
    })
  }

  for (const r of csv('nsf_domaine.csv')) {
    await db.nsfDomaine.upsert({
      where: { code: r.code! },
      update: { titre: r.titre!, grandDomaineCode: r.grand_domaine_code! },
      create: { code: r.code!, titre: r.titre!, grandDomaineCode: r.grand_domaine_code! },
    })
  }

  for (const r of csv('nsf_groupe.csv')) {
    await db.nsfGroupe.upsert({
      where: { code: r.code! },
      update: { titre: r.titre!, domaineCode: r.domaine_code! },
      create: { code: r.code!, titre: r.titre!, domaineCode: r.domaine_code! },
    })
  }

  for (const r of csv('nsf_champs.csv')) {
    await db.nsfChamps.upsert({
      where: { code: r.code! },
      update: { titre: r.titre! },
      create: { code: r.code!, titre: r.titre! },
    })
  }

  for (const r of csv('nsf_specialite.csv')) {
    await db.nsfSpecialite.upsert({
      where: { code: r.code! },
      update: { titre: r.titre!, groupeCode: r.groupe_code!, champsCode: r.champs_code! },
      create: {
        code: r.code!,
        titre: r.titre!,
        groupeCode: r.groupe_code!,
        champsCode: r.champs_code!,
      },
    })
  }

  const n = await db.nsfSpecialite.count()
  console.log(`  ✓ NSF — ${n} spécialités`)
}

// ─────────────────────────────────────────────────────────────────────────
//  3 · Qualiopi — the référentiel SKELETON
//
//  🔴 THE CRITERIA ARE STABLE. THE INDICATORS ARE NOT — AND WE DO NOT
//     INVENT THEM.
//
//  The seven criteria below are settled and safe to seed. The 32 indicators
//  (22 applicable to a pure OF) must be entered from the OFFICIAL GUIDE DE
//  LECTURE — and a projet de décret (NOR TRSD2609875D) would replace the
//  indicator annex with effect from 1 November 2026.
//
//  Which is exactly why the référentiel is DATA and not code: swapping it is
//  a migration, not a rewrite.
//
//  → Indicators are entered by Alexandra or the Qualiopi consultant,
//    in the app, against the current guide. NOT by an LLM. NOT from memory.
//    See AGENTS.md — "never invent Qualiopi indicator numbers".
// ─────────────────────────────────────────────────────────────────────────
const CRITERES = [
  { numero: 1, titre: "Les conditions d'information du public" },
  { numero: 2, titre: "L'identification précise des objectifs des prestations et leur adaptation au public bénéficiaire" },
  { numero: 3, titre: "L'adaptation aux publics bénéficiaires des prestations et des modalités d'accueil, d'accompagnement, de suivi et d'évaluation" },
  { numero: 4, titre: "L'adéquation des moyens pédagogiques, techniques et d'encadrement" },
  { numero: 5, titre: "La qualification et le développement des connaissances et compétences des personnels" },
  { numero: 6, titre: "L'inscription et l'investissement du prestataire dans son environnement professionnel" },
  { numero: 7, titre: "Le recueil et la prise en compte des appréciations et des réclamations" },
]

async function seedReferentiel() {
  const existing = await db.referentiel.findFirst({ where: { isActive: true } })
  if (existing) return console.log('  · Référentiel — already seeded')

  const ref = await db.referentiel.create({
    data: {
      name: 'Référentiel National Qualité',
      version: 'à confirmer', // ⚠️ Alexandra / certifier
      effectiveFrom: new Date('2022-01-01'),
      isActive: true,
      criteres: { create: CRITERES },
    },
  })

  console.log(`  ✓ Référentiel — 7 critères`)
  console.log(`  ⚠️  INDICATORS NOT SEEDED — enter them from the official guide de lecture.`)
  console.log(`     Do not invent them. Do not let an LLM invent them.`)
  return ref
}

// ─────────────────────────────────────────────────────────────────────────
//  4 · Alexandra — SUPER_ADMIN *and* FORMATEUR
//
//  🔴 Roles are a SET, not a field. Alexandra owns PANDO (Google OAuth,
//     @pando-formation.fr) and also delivers parcours herself (magic link
//     works for her too — she's a FORMATEUR like Sophie and Anthony).
//     Slice 0 acceptance: "alexandra@pando-formation.fr holds both
//     SUPER_ADMIN and FORMATEUR." Idempotent — safe after db:fixture resets
//     the Formateur table (which SET NULLs User.formateurId; re-running this
//     restores the link).
// ─────────────────────────────────────────────────────────────────────────
async function seedAlexandra() {
  const formateur = await db.formateur.upsert({
    where: { email: 'alexandra@pando-formation.fr' },
    update: {},
    create: {
      firstName: 'Alexandra',
      lastName: 'GENTIL',
      email: 'alexandra@pando-formation.fr',
      contractType: 'INTERNE_DIRIGEANT', // 🔴 no SIREN, no NDA, no ST convention
      tarifJour: 70_000,
      address: '30 Av Jean Jaurès',
      postalCode: '95230',
      city: 'SOISY-SOUS-MONTMORENCY',
    },
  })

  await db.user.upsert({
    where: { email: 'alexandra@pando-formation.fr' },
    update: { roles: ['SUPER_ADMIN', 'FORMATEUR'], formateurId: formateur.id, isActive: true },
    create: {
      email: 'alexandra@pando-formation.fr',
      name: 'Alexandra Gentil',
      roles: ['SUPER_ADMIN', 'FORMATEUR'],
      authMethod: 'GOOGLE_OAUTH',
      formateurId: formateur.id,
    },
  })

  console.log('  ✓ Alexandra — SUPER_ADMIN + FORMATEUR (alexandra@pando-formation.fr)')
}

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n─── SEED ───\n')
  await seedOrganisation()
  await seedNsf()
  await seedReferentiel()
  await seedAlexandra()
  console.log('\n─── done ───\n')
  console.log('Next:  npm run db:fixture   → 8/8 corruption paths must close\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
