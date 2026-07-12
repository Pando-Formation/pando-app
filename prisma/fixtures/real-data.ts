/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PANDO — REAL-DATA FIXTURE · THE HONEST REFEREE
 *
 *  Two jobs:
 *
 *    PART 1 — load PANDO's ACTUAL sessions (OPTA'S sous-traitance · the 9-week
 *             BAM! · the mixed-payer inter cohort · CLIC!). If the model is
 *             right they load. If it is wrong they cannot be expressed.
 *
 *    PART 2 — attempt to write the corruption sitting in DATA_PROCESS.xlsx
 *             TODAY. Every one MUST be rejected by Postgres.
 *
 *  ⚠ Each corruption test asserts the SPECIFIC constraint that should reject
 *    it. A test that throws a foreign-key error instead of a CHECK violation
 *    has passed for the wrong reason — and that is worse than no test at all.
 *
 *  Run:     npm run db:fixture
 *  Expect:  8/8 corruption paths closed.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const log = {
  head: (s: string) => console.log(`\n─── ${s} ───\n`),
  ok: (s: string) => console.log(`  ✓ ${s}`),
  pass: (s: string) => console.log(`  ✅ rejected — ${s}`),
}

// ═══════════════════════════════════════════════════════════════════════════
//  PART 1 — THE REAL SESSIONS
// ═══════════════════════════════════════════════════════════════════════════

async function reset() {
  // FK order. Reference data (NSF, référentiel, Organisation) is left alone.
  await db.attendance.deleteMany()
  await db.parcoursParticipant.deleteMany()
  await db.financement.deleteMany()
  await db.contractualisation.deleteMany()
  await db.sequence.deleteMany()
  await db.parcours.deleteMany()
  await db.formationVersion.deleteMany()
  await db.formation.deleteMany()
  await db.participant.deleteMany()
  await db.formateurCompetence.deleteMany()
  await db.formateur.deleteMany()
  await db.clientContact.deleteMany()
  await db.client.deleteMany()
}

/** 🔴 The catalogue is WIDER than the four branded programmes. */
async function seedCatalogue() {
  const mk = async (data: Parameters<typeof db.formation.create>[0]['data']) => {
    const f = await db.formation.create({ data })
    return db.formationVersion.create({ data: { formationId: f.id, version: 1, snapshot: {} } })
  }

  const bam = await mk({
    internalCode: 'BAM',
    title: 'BAM! — Bien Ancrer son Management',
    brandProgramme: 'BAM',
    durationHours: 24.5,
    durationDays: 3.5,
    format: 'PRESENTIEL_DISTANCIEL',
    prerequisites: 'Aucun',
    targetAudience: 'Managers en prise de poste (0–2 ans)',
    // 🔴 FIVE objectives. The old sheet capped at three (objectif1/2/3).
    pedagogicObjectives: [
      'Prendre du recul sur leur posture et clarifier leur projet managérial',
      'Communiquer avec justesse et aisance dans toutes les directions (360°)',
      'Motiver et fédérer leur équipe autour d’objectifs partagés',
      'Organiser leur temps et leurs priorités dans un environnement contraint',
      'Orchestrer la performance collective en mobilisant l’intelligence de chacun',
    ],
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap. Référent : contact@pando-formation.fr',
    priceInterPerPerson: 51_000,
  })

  const clic = await mk({
    internalCode: 'CLIC',
    title: "CLIC! — Construire l'impact collectif",
    brandProgramme: 'CLIC',
    // 🔴 The ONLY programme where an absence breaks the PEDAGOGY, not the paperwork.
    requiresFullCohort: true,
    intraOnly: true,
    durationHours: 10.5,
    durationDays: 1.5,
    format: 'PRESENTIEL',
    prerequisites: 'Aucun',
    targetAudience: 'Comités de direction — collectif complet requis',
    pedagogicObjectives: ['Décider et arbitrer ensemble dans des contextes complexes'],
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap.',
  })

  // 🔴 NOT a branded programme. A real formation from DATA_PROCESS.xlsx.
  const changement = await mk({
    internalCode: 'MC-01',
    title: 'Devenir manager du changement',
    durationHours: 14,
    durationDays: 2,
    format: 'PRESENTIEL',
    prerequisites: 'Aucun',
    targetAudience: 'Managers',
    pedagogicObjectives: ['Conduire le changement'],
    delaiAcces: '15 jours ouvrés',
    accessibilite: 'Accessible aux personnes en situation de handicap.',
  })

  return { bam, clic, changement }
}

async function scenarioFormateurs() {
  await db.formateur.create({
    data: {
      firstName: 'Alexandra', lastName: 'GENTIL',
      email: 'alexandra@pando-formation.fr',
      contractType: 'INTERNE_DIRIGEANT', // 🔴 no SIREN, no NDA, no ST convention
      tarifJour: 70_000,
      address: '30 Av Jean Jaurès', postalCode: '95230', city: 'SOISY-SOUS-MONTMORENCY',
    },
  })

  await db.formateur.create({
    data: {
      firstName: 'Sophie', lastName: 'SCHACRE-LAFFONT',
      // 🔴 gmail. Domain-restricted Google OAuth would lock her out FOREVER —
      //    and the émargement (slice 8) is her screen.
      email: 'sophieschacre@gmail.com',
      contractType: 'EXTERNE_PRESTATAIRE',
      siren: '931001093',
      nda: '11931001093',
      tvaRate: 0, // franchise en base → 720 €/day
      tarifJour: 70_000,
      forfaitDeplacement: 2_000,
      // 🔴 THE FIELD THE SPREADSHEET CORRUPTED — an Excel autofill drag made it
      //    28 → 29 → 30 → … → 34 rue Joliot Curie, wrong on 6 of 7 rows, and it
      //    prints onto a convention de sous-traitance.
      //    HERE IT EXISTS ONCE AND CANNOT DRIFT.
      address: '28 rue Joliot Curie', postalCode: '93230', city: 'ROMAINVILLE',
    },
  })

  await db.formateur.create({
    data: {
      firstName: 'Anthony', lastName: 'PEREIRA',
      email: 'anthony@blueje.com',
      contractType: 'EXTERNE_PRESTATAIRE',
      siren: '770877977',
      nda: '11770877977',
      tvaRate: 0.2, // 🔴 → 860 €/day, NOT 720 €. Absorbed, not passed through.
      tarifJour: 70_000,
      forfaitDeplacement: 2_000,
    },
  })

  log.ok('Formateurs — Alexandra 0 €/j (interne, transfert notionnel) · Sophie 720 €/j · Anthony 860 €/j (TVA absorbée)')
}

/**
 * OPTA'S — PANDO IS THE SUBCONTRACTOR.
 *   Donneur d'ordre : OPTA'S, Besançon
 *   Bénéficiaire    : CAF des Hauts-de-Seine, Nanterre
 *   Rate            : 700 €/j WHOLESALE (vs 1 535 € retail for Le 104)
 *   Dates           : 16 Jun 2026 → 18 Mar 2027 — SIX séquences, NINE MONTHS
 *
 * ⚠️ A flat Session with one startDate/endDate loses eight of the ten dates.
 * ⚠️ The old model had ONE client FK. This needs three.
 */
async function scenarioOptas(formationVersionId: string) {
  const optas = await db.client.create({
    data: {
      companyName: "OPTA'S",
      siret: '90962511300016', // String. In the sheet: a float.
      siren: '909625113',
      address: '14B rue Lafayette', postalCode: '25000', city: 'BESANÇON',
      status: 'ACTIF', origin: 'APPEL_OFFRE',
      contacts: {
        create: [
          { roles: ['ADMINISTRATIF'], civilite: 'MADAME', firstName: 'Caroline', lastName: 'TATU', fonction: 'Assistante de gestion', email: 'c.tatu@optas.example' },
          { roles: ['SIGNATAIRE'], civilite: 'MONSIEUR', firstName: 'Pierre-Henri', lastName: 'HAMBURGER', fonction: 'Directeur Général', email: 'ph.hamburger@optas.example' },
        ],
      },
    },
  })

  const caf = await db.client.create({
    data: {
      companyName: 'CAF des Hauts-de-Seine',
      isPublicSector: true, // ⚠️ confirm catégorie juridique via SIRENE (§15 Q13)
      address: '70 rue Paul Lescop', postalCode: '92000', city: 'NANTERRE',
      status: 'ACTIF',
    },
  })

  const parcours = await db.parcours.create({
    data: {
      reference: '2026-F103',
      formationVersionId,
      pandoRole: 'SOUS_TRAITANT',
      donneurOrdreId: optas.id, // required by CHECK 4
      beneficiaireId: caf.id,   // 🔴 where it ACTUALLY happens
      clientId: optas.id,
      track: 'INTRA',
      status: 'CONFIRME',
    },
  })

  const dates = ['2026-06-16', '2026-09-15', '2026-11-10', '2026-12-08', '2027-02-09', '2027-03-18']
  for (const [i, d] of dates.entries()) {
    await db.sequence.create({
      data: {
        parcoursId: parcours.id,
        ordre: i + 1,
        titre: `Session ${i + 1} — Devenir manager du changement`,
        type: 'PRESENTIEL',
        date: new Date(d),
        demiJournees: ['MATIN', 'APRES_MIDI'],
        heures: 14,
        lieu: 'CAF des Hauts-de-Seine, Nanterre',
        preuveType: 'SIGNATURE',
      },
    })
  }

  log.ok(`OPTA'S — sous-traitance · 6 séquences · 2026-06-16 → 2027-03-18 · bénéficiaire ≠ commanditaire`)
}

/** BAM! — NINE WEEKS. NINE EVENTS. FOUR MODALITIES. FOUR PROOF TYPES. */
async function scenarioBam(formationVersionId: string) {
  const parcours = await db.parcours.create({
    data: {
      reference: '2026-F118',
      formationVersionId,
      track: 'INTER',
      clientId: null, // 🔴 an INTER parcours has NO client
      status: 'CONFIRME',
      minParticipants: 6,
      maxParticipants: 10,
    },
  })

  const seqs = [
    { t: 'Kick-off + capsule de positionnement',                 y: 'ELEARNING',        p: 'COMPLETION',   dj: ['MATIN'] as const,               h: 0.5, d: '2026-09-07' },
    { t: 'Jour 1 — Construire son identité managériale',         y: 'PRESENTIEL',       p: 'SIGNATURE',    dj: ['MATIN', 'APRES_MIDI'] as const, h: 7,   d: '2026-09-14' },
    { t: 'Défi 1 — Donner et recevoir de la reconnaissance',     y: 'DEFI',             p: 'COMPLETION',   dj: ['MATIN'] as const,               h: 0.5, d: '2026-09-18' },
    { t: 'Étude de cas en collectif',                            y: 'TRAVAIL_AUTONOME', p: 'COMPLETION',   dj: ['MATIN'] as const,               h: 0.5, d: '2026-09-24' },
    { t: "Jour 2 — Structurer l'organisation de son équipe",     y: 'PRESENTIEL',       p: 'SIGNATURE',    dj: ['MATIN', 'APRES_MIDI'] as const, h: 7,   d: '2026-10-05' },
    { t: 'Flash coaching individuel',                            y: 'COACHING',         p: 'COMPTE_RENDU', dj: ['APRES_MIDI'] as const,          h: 1,   d: '2026-10-13' },
    { t: 'Jour 3 — Orchestrer la performance',                   y: 'PRESENTIEL',       p: 'SIGNATURE',    dj: ['MATIN', 'APRES_MIDI'] as const, h: 7,   d: '2026-10-20' },
    { t: 'Indicateurs clés — collectif autonome',                y: 'TRAVAIL_AUTONOME', p: 'COMPLETION',   dj: ['MATIN'] as const,               h: 0.5, d: '2026-10-28' },
    { t: "Retour d'expérience en visio",                         y: 'DISTANCIEL',       p: 'CONNEXION',    dj: ['APRES_MIDI'] as const,          h: 2.5, d: '2026-11-09' },
  ] as const

  for (const [i, s] of seqs.entries()) {
    await db.sequence.create({
      data: {
        parcoursId: parcours.id,
        ordre: i + 1,
        titre: s.t,
        type: s.y,
        date: new Date(s.d),
        demiJournees: [...s.dj],
        heures: s.h,
        preuveType: s.p,
      },
    })
  }

  const total = seqs.reduce((a, s) => a + s.h, 0)
  log.ok(`BAM! — 9 séquences · 4 modalités · 4 types de preuve · ${total}h sur 9 semaines`)
  return parcours
}

/**
 * BAM! INTER BORDEAUX — 7 PARTICIPANTS, 4 PAYERS, 3 FUNDING ORIGINS.
 * The scenario that killed Parcours.commanditaireId.
 *
 * 🔴 Groupe Cassous must NEVER receive Enedis's employee's attestation.
 *    Documents are scoped to the CONTRACTUALISATION, never to the PARCOURS.
 *    The legacy process doc instructs the opposite. Do not follow it.
 */
async function scenarioMixedPayer(parcoursId: string) {
  const payers = [
    { name: 'Groupe Cassous',     siret: '39284756100024', seats: 4, fin: 'OPCO' as const,               pub: false },
    { name: 'Cabinet Mérignac',   siret: '48291736500011', seats: 1, fin: 'ENTREPRISE_DIRECTE' as const, pub: false },
    { name: 'Bordeaux Métropole', siret: '24330031600011', seats: 1, fin: 'AUTRE' as const,              pub: true  }, // → Chorus Pro
    { name: 'Enedis Sud-Ouest',   siret: '44460844213897', seats: 1, fin: 'OPCO' as const,               pub: false },
  ]

  let seat = 0
  for (const p of payers) {
    const client = await db.client.create({
      data: {
        companyName: p.name, siret: p.siret, isPublicSector: p.pub,
        status: 'ACTIF', postalCode: '33000', city: 'BORDEAUX',
      },
    })

    const contract = await db.contractualisation.create({
      data: {
        parcoursId,
        payerType: 'ORGANISATION',
        payerClientId: client.id, // CHECK 8: exactly one payer target
        status: 'CONVENTION_SIGNEE',
        priceMode: 'PAR_PERSONNE',
        montantHT: p.seats * 178_500, // 1 785 € HT per seat, in cents
        financements: { create: { type: p.fin, montantPrisEnCharge: p.seats * 178_500 } },
      },
    })

    for (let i = 0; i < p.seats; i++) {
      seat++
      const participant = await db.participant.create({
        data: {
          firstName: `Participant${seat}`,
          lastName: p.name.split(' ')[0] ?? 'X',
          email: `p${seat}@example.com`,
          situation: 'SALARIE',
          clientId: client.id,
        },
      })
      await db.parcoursParticipant.create({
        data: { parcoursId, participantId: participant.id, contractualisationId: contract.id },
      })
    }
  }

  const sum = await db.contractualisation.aggregate({ where: { parcoursId }, _sum: { montantHT: true } })
  log.ok(`Bordeaux — 7 participants · 4 payeurs · 3 origines de financement · Σ ${(sum._sum.montantHT ?? 0) / 100} € (dérivé)`)
}

/** CLIC! — three séquences of ONE demi-journée each. requiresFullCohort. */
async function scenarioClic(formationVersionId: string) {
  const mairie = await db.client.create({
    data: {
      companyName: 'Mairie de Bordeaux',
      siret: '21330063200017',
      isPublicSector: true, // 🔴 cat. jur. 7210 → Chorus Pro
      status: 'ACTIF', postalCode: '33000', city: 'BORDEAUX',
    },
  })

  const parcours = await db.parcours.create({
    data: {
      reference: '2026-F121',
      formationVersionId,
      clientId: mairie.id,
      track: 'INTRA',
      status: 'CONFIRME',
      minParticipants: 7,
      maxParticipants: 7, // 🔴 requiresFullCohort → min = max. The exact CODIR.
    },
  })

  const djs = [
    { t: 'DJ1 — Sommes-nous réellement une équipe de direction ?', d: '2026-10-06' },
    { t: 'DJ2 — Pouvons-nous débattre et décider ensemble ?',      d: '2026-11-10' },
    { t: 'DJ3 — Aligner vision, décisions et actions',             d: '2026-12-01' },
  ]

  for (const [i, dj] of djs.entries()) {
    await db.sequence.create({
      data: {
        parcoursId: parcours.id,
        ordre: i + 1,
        titre: dj.t,
        type: 'PRESENTIEL',
        date: new Date(dj.d),
        demiJournees: ['MATIN'], // 🔴 ONE demi-journée. The legal unit, proven.
        heures: 3.5,
        preuveType: 'SIGNATURE',
      },
    })
  }

  log.ok('CLIC! — 3 séquences · 1 demi-journée chacune · collectif complet requis (7/7)')
}

// ═══════════════════════════════════════════════════════════════════════════
//  PART 2 — THE CORRUPTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

type Ctx = { parcoursId: string; sequenceId: string; participantId: string; formationVersionId: string }

async function corruptionTests(ctx: Ctx) {
  const tests = [
    {
      name: 'SIRET as a float',
      why: 'The live sheet stores 50837292700014 as 5.0837292700014E13',
      expect: 'client_siret_14_digits',
      run: () => db.client.create({ data: { companyName: 'Float SIRET', siret: '5.0837292700014E13' } }),
    },
    {
      name: 'Postcode without its leading zero',
      why: 'Every client in departments 01–09 loses it when stored as a number',
      expect: 'client_postal_code_format',
      run: () => db.client.create({ data: { companyName: 'Bad CP', postalCode: '9200' } }),
    },
    {
      name: 'Phantom convention de sous-traitance',
      why: "Alexandra is INTERNE_DIRIGEANT yet carries ST convention 2026-ST100 in the live sheet — a legal document describing a relationship that does not exist. Her siren cell holds OPTA'S's SIREN.",
      expect: 'formateur_internal_no_siren_nda',
      run: () =>
        db.formateur.create({
          data: {
            firstName: 'Phantom', lastName: 'INTERNE',
            email: 'phantom@pando-formation.fr',
            contractType: 'INTERNE_DIRIGEANT',
            siren: '909625113',  // ← the CLIENT's SIREN, pasted into the formateur cell
            nda: '11950745495',  // ← PANDO'S NDA, not a personal one
          },
        }),
    },
    {
      name: '⭐ PRESENT with no proof of presence',
      why: 'THE ONE THAT MATTERS. This is what makes a false audit trail physically unwritable.',
      expect: 'attendance_presence_requires_proof',
      run: () =>
        db.attendance.create({
          data: {
            sequenceId: ctx.sequenceId,
            participantId: ctx.participantId,
            demiJournee: 'MATIN',
            status: 'PRESENT',
            preuveType: 'SIGNATURE',
            // no signedAt · no connectedAt · no completedAt · no documentId
          },
        }),
    },
    {
      name: 'Absence with no justification',
      why: 'A gap with no reason reads as sloppiness. With one, it reads as a managed event. Criterion 3.',
      expect: 'attendance_absence_justified',
      run: () =>
        db.attendance.create({
          data: {
            sequenceId: ctx.sequenceId,
            participantId: ctx.participantId,
            demiJournee: 'APRES_MIDI',
            status: 'ABSENT_JUSTIFIE',
            preuveType: 'SIGNATURE',
            // no justification
          },
        }),
    },
    {
      name: 'Self-funding individual with no rétractation window',
      why: 'A private payer has 10 days. The process doc\'s "paiement 48h avant" may be unlawful here.',
      expect: 'contract_individu_retractation',
      run: async () => {
        const p = await db.participant.create({
          data: { firstName: 'Sarah', lastName: 'VIDAL', email: 'sarah.vidal@example.com', situation: 'PARTICULIER' },
        })
        return db.contractualisation.create({
          data: {
            parcoursId: ctx.parcoursId,
            payerType: 'INDIVIDU',
            payerParticipantId: p.id,
            // no retractationEndsAt
          },
        })
      },
    },
    {
      name: "Sous-traitance with no donneur d'ordre",
      why: 'If PANDO is the subcontractor, someone else is the prime. Name them.',
      expect: 'parcours_soustraitant_has_donneur_ordre',
      run: () =>
        db.parcours.create({
          data: {
            reference: 'BAD-ST',
            formationVersionId: ctx.formationVersionId,
            track: 'INTRA',
            pandoRole: 'SOUS_TRAITANT',
            // no donneurOrdreId
          },
        }),
    },
    {
      name: 'Cancellation with no reason',
      why: 'Cancellations are normal. Unexplained ones are not.',
      expect: 'parcours_cancellation_reason',
      run: () =>
        db.parcours.create({
          data: {
            reference: 'BAD-CANCEL',
            formationVersionId: ctx.formationVersionId,
            track: 'INTRA',
            status: 'ANNULE',
            // no cancellationReason
          },
        }),
    },
  ]

  log.head('CORRUPTION TESTS — every one MUST be rejected')
  let passed = 0

  for (const t of tests) {
    try {
      await t.run()
      console.error(`  ❌ ACCEPTED — ${t.name}`)
      console.error(`     ${t.why}`)
      console.error(`     🔴 THE MODEL IS BROKEN. The app will reproduce the spreadsheet at scale.\n`)
    } catch (e) {
      const msg = String(e)
      // ⚠️ It must be rejected by the RIGHT constraint. A foreign-key error would
      //    mean the test passed for the wrong reason — worse than no test at all.
      if (msg.includes(t.expect)) {
        log.pass(t.name)
        passed++
      } else {
        console.error(`  ⚠️  ${t.name} — threw, but NOT via "${t.expect}".`)
        console.error(`     A test that passes for the wrong reason is worse than no test.`)
        console.error(`     Did 0002_check_constraints run?  npx prisma migrate deploy`)
        console.error(`     ${msg.split('\n').find((l) => l.trim()) ?? ''}\n`)
      }
    }
  }

  console.log(`\n  ${passed}/${tests.length} corruption paths closed.\n`)

  if (passed < tests.length) {
    console.error('  🔴 SLICE 0 IS NOT DONE. Nothing else starts.\n')
    process.exit(1)
  }
  console.log('  ✅ Slice 0 gate passed. The spreadsheet cannot be reproduced.\n')
}

// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  log.head('REAL SESSIONS')
  await reset()
  const v = await seedCatalogue()

  await scenarioFormateurs()
  await scenarioOptas(v.changement.id)
  const bam = await scenarioBam(v.bam.id)
  await scenarioMixedPayer(bam.id)
  await scenarioClic(v.clic.id)

  const seq = await db.sequence.findFirstOrThrow({ where: { parcoursId: bam.id, ordre: 2 } })
  const pp = await db.parcoursParticipant.findFirstOrThrow({ where: { parcoursId: bam.id } })

  await corruptionTests({
    parcoursId: bam.id,
    sequenceId: seq.id,
    participantId: pp.participantId,
    formationVersionId: v.bam.id,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
