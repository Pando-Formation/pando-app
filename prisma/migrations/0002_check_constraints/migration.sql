-- ═══════════════════════════════════════════════════════════════════════════
--  PANDO — 0002_check_constraints
--
--  Prisma cannot express these. They are NOT optional.
--
--  These constraints are the reason the app can be trusted. They make the
--  defects found in PANDO's live data — and the false audit trails that would
--  follow from them — PHYSICALLY UNWRITABLE. An LLM can rationalise its way
--  around a comment. It cannot argue with Postgres.
--
--  Run AFTER 0001_init.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1 · THE PHANTOM-CONVENTION RULE
--
-- An INTERNAL formateur cannot carry a SIREN or an NDA — and therefore cannot
-- generate a convention de sous-traitance. PANDO does not subcontract to its
-- own owner.
--
-- In the live spreadsheet, Alexandra GENTIL (owner of PANDO, acting under
-- PANDO) carries convention number 2026-ST100 — a legal document describing a
-- relationship that does not exist. Her `siren_formateur` cell reads
-- 909625113, which is the SIREN embedded in OPTA'S's own SIRET: the client's
-- SIREN, pasted into the formateur column.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Formateur" ADD CONSTRAINT formateur_internal_no_siren_nda
  CHECK (
    "contractType" = 'EXTERNE_PRESTATAIRE'
    OR ("siren" IS NULL AND "nda" IS NULL)
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 2 · IDENTIFIER FORMATS
--
-- The live sheet stores SIRET as a float (5.0837292700014E13) and phone as
-- 6.46633164E8 — the leading zero of 0646633164 is gone. Le 104 Paris appears
-- with two different postcodes. Sophie's street number was incremented by an
-- Excel autofill drag and is wrong on 6 of 7 rows.
--
-- None of that is carelessness. It is what happens when nothing stops it.
-- This is what stops it.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Client" ADD CONSTRAINT client_siret_14_digits
  CHECK ("siret" IS NULL OR "siret" ~ '^[0-9]{14}$');

ALTER TABLE "Client" ADD CONSTRAINT client_siren_9_digits
  CHECK ("siren" IS NULL OR "siren" ~ '^[0-9]{9}$');

ALTER TABLE "Client" ADD CONSTRAINT client_postal_code_format
  CHECK ("postalCode" IS NULL OR "postalCode" ~ '^[0-9]{5}$');

ALTER TABLE "Formateur" ADD CONSTRAINT formateur_siren_9_digits
  CHECK ("siren" IS NULL OR "siren" ~ '^[0-9]{9}$');

ALTER TABLE "Organisation" ADD CONSTRAINT organisation_siret_14_digits
  CHECK ("siret" ~ '^[0-9]{14}$');


-- ─────────────────────────────────────────────────────────────────────────
-- 3 · NO SILENT CANCELLATION
--
-- Cancellations are normal. UNEXPLAINED cancellations are not.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Parcours" ADD CONSTRAINT parcours_cancellation_reason
  CHECK ("status" <> 'ANNULE' OR "cancellationReason" IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────────────
-- 4 · SOUS-TRAITANCE COHERENCE
--
-- If PANDO is the subcontractor, someone else is the prime. Name them.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Parcours" ADD CONSTRAINT parcours_soustraitant_has_donneur_ordre
  CHECK ("pandoRole" <> 'SOUS_TRAITANT' OR "donneurOrdreId" IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────────────
-- 5 · AN ABANDON IS A MANAGED EVENT, NOT A GAP
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "ParcoursParticipant" ADD CONSTRAINT pp_abandon_reason
  CHECK ("status" <> 'ABANDON' OR "abandonReason" IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────────────
-- 6 · AN ABSENCE WITH NO REASON READS AS SLOPPINESS
--
-- With a reason and a traced response, it reads as a managed event.
-- That distinction is the whole of Criterion 3 in one sentence.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Attendance" ADD CONSTRAINT attendance_absence_justified
  CHECK (
    "status" NOT IN ('ABSENT_JUSTIFIE', 'ABSENT_NON_JUSTIFIE')
    OR "justification" IS NOT NULL
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 7 · PRESENCE REQUIRES PROOF   ⭐ THE MOST IMPORTANT CONSTRAINT IN THIS FILE
--
-- You cannot mark someone present without evidence that they were.
--
-- This is what makes a FALSE AUDIT TRAIL physically unwritable. Any code path
-- — human-written or LLM-written — that tries to record attendance without a
-- signature, a connection log, a completion trace or a scanned paper sheet
-- will be REJECTED BY THE DATABASE.
--
-- Proof-as-exhaust, enforced.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Attendance" ADD CONSTRAINT attendance_presence_requires_proof
  CHECK (
    "status" <> 'PRESENT'
    OR "signedAt"    IS NOT NULL   -- présentiel  : signature
    OR "connectedAt" IS NOT NULL   -- distanciel  : connection log
    OR "completedAt" IS NOT NULL   -- e-learning  : completion trace
    OR "documentId"  IS NOT NULL   -- paper       : scanned sheet
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 8 · CONTRACTUALISATION — EXACTLY ONE PAYER
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Contractualisation" ADD CONSTRAINT contract_one_payer
  CHECK (
    num_nonnulls("payerClientId", "payerParticipantId", "financeurId") = 1
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 9 · RÉTRACTATION — SELF-FUNDING INDIVIDUALS
--
-- A private individual paying for their own training has a 10-day délai de
-- rétractation. No payment may be demanded during it.
--
-- The legacy process doc says "paiement 48h avant le début de la formation".
-- For a self-funding individual that may be UNLAWFUL.
-- Payment trigger = max(J-2, retractationEndsAt).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Contractualisation" ADD CONSTRAINT contract_individu_retractation
  CHECK ("payerType" <> 'INDIVIDU' OR "retractationEndsAt" IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────────────
-- 10 · EVIDENCE LINKS — EXACTLY ONE ARTEFACT
--
-- An evidence link points at one thing. Conformity is computed from these;
-- an ambiguous link is a corrupt audit trail.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "EvidenceLink" ADD CONSTRAINT evidence_one_artefact
  CHECK (
    num_nonnulls(
      "parcoursId", "documentId", "attendanceId", "evaluationId",
      "analyseBesoinId", "livrableId", "reclamationId", "actionId", "veilleId"
    ) = 1
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 11 · MONEY IS NEVER NEGATIVE (use an avoir, not a negative invoice)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Contractualisation" ADD CONSTRAINT contract_amounts_non_negative
  CHECK ("montantHT" >= 0 AND "remise" >= 0);

ALTER TABLE "Parcours" ADD CONSTRAINT parcours_amount_non_negative
  CHECK ("montantHT" >= 0);


-- ─────────────────────────────────────────────────────────────────────────
-- 12 · A SEQUENCE HAS AT LEAST ONE DEMI-JOURNÉE
--
-- The demi-journée is the legal unit. A séquence with none produces no
-- certifiable hours.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE "Sequence" ADD CONSTRAINT sequence_has_demi_journee
  CHECK (array_length("demiJournees", 1) >= 1);

ALTER TABLE "Sequence" ADD CONSTRAINT sequence_hours_positive
  CHECK ("heures" > 0);


-- ═══════════════════════════════════════════════════════════════════════════
--  ENFORCED IN THE APPLICATION LAYER (no SQL expression possible)
--  These are not lesser rules. They are simply not expressible here.
--  They belong in service-layer tests, and they are listed in AGENTS.md.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  A. 🔴 RGPD — DOCUMENT SCOPING
--     ATTESTATION_FORMATION, CERTIFICAT_REALISATION and
--     QUESTIONNAIRE_COMMANDITAIRE are addressed to a CONTRACTUALISATION,
--     never to a PARCOURS.
--
--     In a mixed-payer inter cohort, "send all attestations to the client"
--     discloses one company's employees to another. The legacy process doc
--     explicitly instructs this. DO NOT FOLLOW IT.
--
--  B. 🔴 A HARD-BOUNCED SEND IS NEVER `DONE`
--     DELIVERED (from the Brevo webhook) is the proof. Nothing else is.
--     Never default a status to success. Never optimistically mark done.
--
--  C. DERIVED TOTALS — never entered by hand
--     Parcours.montantHT  = Σ contractualisations.montantHT
--     Parcours.dateDebut  = MIN(sequences.date)
--     Parcours.dateFin    = MAX(sequences.date)
--     Parcours.totalHours = Σ sequences.heures
--     ParcoursParticipant.hoursAttended = Σ attendance where PRESENT
--
--  D. FULL-COHORT PROGRAMMES (CLIC!)
--     When FormationVersion.snapshot.requiresFullCohort is true:
--       minParticipants = maxParticipants
--     An incomplete émargement raises a BLOCKING alert requiring a
--     PEDAGOGICAL justification — not a routine absence note.
--
--  E. CHORUS PRO
--     If client.isPublicSector, an invoice cannot be issued until
--     numeroEngagement AND codeService are present.
--
--  F. DOCUMENT PROVENANCE
--     Every generated document records its templateVersionId, and is generated
--     from FormationVersion (the frozen snapshot) — never from the live
--     Formation.
--
-- ═══════════════════════════════════════════════════════════════════════════
