# PANDO — V1 Slice Specs

**For:** Codex, led by Wes.
**Read first:** `AGENTS.md`, then `PANDO_APP_REFERENCE.md`.
**Rule:** work **one slice at a time**. Do not start slice N+1 until slice N's acceptance criteria pass.

---

## Why V1 exists

> **V1's job is to make the spreadsheet disappear.**
> Not to automate anything. To become the place the work actually happens.

Automation comes in V2 — and it comes *after* Alexandra has run real sessions manually **inside the app**, because you cannot automate a process nobody has performed in the system. V1's manual send buttons are not a compromise. They are how V2 learns what to build.

**The deadline that matters is not the December 2027 audit. It is January 2027** — because the December 2027 audit samples sessions *delivered during 2027*. The app must be in production, running real sessions, from the start of the year.

---

## The acceptance frame

Every slice is judged by one question:

> **Can Alexandra do this, with real PANDO data, without opening Excel?**

Not "does the code work." Not "do the tests pass." **Can she do it.**

Every acceptance criterion below uses **real data from `DATA_PROCESS.xlsx`** — Le 104, OPTA'S, Sophie, Anthony, Alexandra. Not fixtures. Not `test@example.com`. If the criterion passes on invented data but fails on PANDO's, it has not passed.

---

## Slice map

| # | Slice | Ships | Risk |
|---|---|---|---|
| **0** | Foundation & auth | The database exists and refuses corruption | 🟢 |
| **1** | Catalogue | Formations, versioned, programme PDF | 🟢 |
| **2** | Clients & contacts | + SIRENE lookup | 🟢 |
| **3** | Formateurs | + competences, VAT, true cost | 🟠 |
| **4** | **Parcours & séquences** | 🔴 **THE SPINE** | 🔴 |
| **5** | **Participants & contractualisation** | 🔴 **THE PAYER AXIS** | 🔴 |
| **6** | Documents & signature | Generation, YouSign, Qonto | 🟠 |
| **7** | Sending & delivery proof | Brevo. `FAILED` is never `DONE`. | 🔴 |
| **8** | **Émargement (PWA, offline)** | 🔴 **THE HARD ONE** | 🔴 |
| **9** | Amélioration continue | Réclamations · actions · veille | 🟢 |
| **10** | Pilotage | The risk radar | 🟢 |

**Slices 4, 5, 7 and 8 are where this project succeeds or fails.** Everything else is CRUD.

---

## Slice 0 — Foundation & auth

### Goal
The database exists, and it **refuses to store PANDO's corruption**.

### Scope
- Next.js (App Router) · TypeScript strict · **Prisma 6 — pinned**
- `prisma migrate dev` → `0001_init` (**all 49 models** — see below)
- `0002_check_constraints` — the raw-SQL migration
- Seed: NSF (511 rows), référentiel skeleton, `Organisation` (PANDO, NDA `11950745495`)
- Auth.js: **Google OAuth** (domain `pando-formation.fr`) for admins · **email magic link** for formateurs
- Design-system tokens (`Roboto` + `Roboto Serif` — **not Inter**), app shell, nav

### 🔴 The instruction you will want to ignore
**Migrate all 49 models now**, even though this slice uses three.

The schema is cheap to write and **brutal to change** once real signed conventions reference it. Do **not** "simplify" it to match the current slice.

### Acceptance
- [ ] `npx prisma validate` passes · `tsc --noEmit` clean
- [ ] **`npx tsx prisma/fixtures/real-data.ts` → 8/8 corruption paths closed.** ⭐ **Nothing else starts until this is green.**
- [ ] Alexandra signs in with Google (`@pando-formation.fr`)
- [ ] **Sophie signs in with a magic link at `sophieschacre@gmail.com`** — she has no PANDO address and Google OAuth would lock her out forever
- [ ] `alexandra@pando-formation.fr` holds **both** `SUPER_ADMIN` and `FORMATEUR`. Roles are a **set**.

### Trap
Codex will restrict *all* auth to the Google domain. **The formateur role becomes unusable and you will not notice until slice 8.**

---

## Slice 1 — Catalogue

### Goal
Formations are structured data. The programme PDF is **generated**, never uploaded.

### Scope
- `Formation` CRUD (**SUPER_ADMIN only**)
- `FormationVersion` — **immutable snapshot on every edit**
- NSF **cascading** picker: grand domaine → domaine → groupe → **champs** → spécialité
- Programme PDF generated from `FormationVersion` (Puppeteer, **own Cloud Run service**)

### Acceptance
- [ ] Alexandra creates **"Médiation et gestion des conflits"** — 7h / 1j, présentiel. *(Not BAM!. The real catalogue is wider than the four branded programmes.)*
- [ ] She creates **BAM!** with **five** pedagogic objectives. *(The old sheet capped at three: `objectif1/2/3`.)*
- [ ] She generates the programme PDF. It contains the objectives, prerequisites, **délai d'accès** and **accessibilité**.
- [ ] She edits the objectives → **v2 is created; v1 is intact and still readable.**
- [ ] The NSF picker **explains `champs`**. `315m` / `315n` / `315p` / `315r` are the *same subject* with different functions — a flat 380-item dropdown gets mis-picked once and then poisons every BPF.
- [ ] `requiresFullCohort` is settable, and CLIC! has it.

### Trap
Codex will add `programmeUrl: String` and let someone upload a PDF. **That is a silent drift machine** — Criterion 1 checks that what you publish matches what you deliver.

---

## Slice 2 — Clients & contacts

### Goal
A client is entered **once**, correctly, and cannot be wrong.

### Scope
- `Client` CRUD · **SIRENE lookup on SIRET**
- `ClientContact` with roles (`PRINCIPAL` / `ADMINISTRATIF` / `SIGNATAIRE`)
- `isPublicSector` auto-flagged from **catégorie juridique `7xxx`**

### Acceptance
- [ ] Alexandra types Le 104's SIRET → SIRENE returns **name, address, NAF, catégorie juridique**. She types nothing else.
- [ ] Pasting `5.0837292700014E13` is **rejected**, with a message that explains why.
- [ ] Le 104 has **two contacts**: Marion (`ADMINISTRATIF`) and Bénédicte (`SIGNATAIRE`). *(The old model flattened these into two fields on the client.)*
- [ ] **Mairie de Bordeaux is auto-flagged `isPublicSector`** (cat. jur. `7210`) — and the UI says *"Facture via Chorus Pro."*
- [ ] A postcode of `9200` is rejected. `92000` is accepted.

---

## Slice 3 — Formateurs

### Goal
The phantom convention becomes **impossible**. The true cost becomes **visible**.

### Scope
- `Formateur` CRUD · `contractType` · `tvaRate` · `forfaitDeplacement`
- `FormateurCompetence` (+ expiry warnings)

### Acceptance
- [ ] **Alexandra is `INTERNE_DIRIGEANT`. The SIREN and NDA fields are disabled.** Trying to save them → `CHECK 1` rejects. **`2026-ST100` is now unwritable.**
- [ ] Sophie: `EXTERNE_PRESTATAIRE`, TVA **0%**, 700 €/j + 20 € travel → cost **720 €/day**
- [ ] Anthony: `EXTERNE_PRESTATAIRE`, TVA **20%**, 700 €/j + 20 € travel → cost **860 €/day**
- [ ] 🔴 Anthony's cost shows **860 €, not 720 €.** PANDO makes VAT-exonerated supplies and very likely cannot deduct input VAT — his 20% is an **absorbed cost**, not a pass-through.
- [ ] 🔴 Alexandra's cost is **0 €.** Her 700 €/day is an internal transfer, not cash out.
- [ ] A certification expiring in <60 days raises a warning. *(A formateur with a lapsed certification delivering a parcours is a Criterion 5 non-conformity.)*

### Trap
Codex will compute margin on HT and treat internal formateurs as a cost. **The margin dashboard will then be wrong in both directions on every parcours.**

---

## Slice 4 — 🔴 Parcours & séquences · THE SPINE

### Goal
Express a **nine-week BAM!** and a **nine-month OPTA'S**. This is the slice everything else inherits.

### Scope
- `Parcours` from a `FormationVersion` (**snapshotted at creation**)
- `Sequence[]` — ordre, titre, type, date, `demiJournees[]`, heures, lieu, formateur, `preuveType`
- **Derived**: `dateDebut` = MIN(séquences) · `dateFin` = MAX · `totalHours` = Σ
- `pandoRole` — `PRESTATAIRE_DIRECT` / `SOUS_TRAITANT` (+ `donneurOrdre`, `beneficiaire`)

### Acceptance
- [ ] **BAM! — 9 séquences, 4 modalities:** kick-off (e-learning) · Jour 1 (présentiel, 2 demi-journées) · Défi 1 · étude de cas · Jour 2 · flash coaching · Jour 3 · collectif autonome · REX visio. **`totalHours` computes itself.**
- [ ] **OPTA'S — 6 séquences, 16 Jun 2026 → 18 Mar 2027.** `pandoRole = SOUS_TRAITANT` · donneur d'ordre = OPTA'S · **bénéficiaire = CAF 92** · 700 €/j wholesale.
- [ ] Saving OPTA'S **without** a donneur d'ordre → `CHECK 4` rejects.
- [ ] **CLIC! — 3 séquences of ONE demi-journée each.** *(This is what proves the demi-journée unit wasn't over-engineering.)*
- [ ] `dateDebut` / `dateFin` / `totalHours` are **read-only**. There is no input for them.
- [ ] Editing the source `Formation` **does not change** an existing parcours.

### Trap
🔴 **Codex will collapse `Sequence` back into `startDate` / `endDate` on `Parcours`.** It is simpler, it looks cleaner, and it makes the app unable to run PANDO's actual products. **If you see this, stop and revert.**

---

## Slice 5 — 🔴 Participants & contractualisation · THE PAYER AXIS

### Goal
**Seven participants. Four payers. One parcours.**

### Scope
- `Participant` · `ParcoursParticipant` (the per-participant state machine)
- `Contractualisation` — the payer × parcours pairing
- `Financement` **on the contractualisation**
- `Situation` → selects the legal document
- The accessibility chain: declared → référent → adaptation → **traced**

### Acceptance
- [ ] **BAM! Inter Bordeaux — 7 participants, 4 contractualisations:** Groupe Cassous (4 seats, OPCO) · Cabinet Mérignac (1, direct) · **Bordeaux Métropole (1, public → Chorus Pro)** · Enedis (1, OPCO). **Three funding origins on one parcours.**
- [ ] `Parcours.montantHT` = **Σ contractualisations**. Read-only.
- [ ] Groupe Cassous gets a volume discount. Cabinet Mérignac does not. **`remise` lives on the contractualisation.**
- [ ] A `PARTICULIER` payer **forces `retractationEndsAt`** (`CHECK 9`). The UI states the **10-day** window and that **payment cannot be demanded during it.**
- [ ] Payment trigger for an individual = `max(J-2, retractationEndsAt)` — **never simply J-2.** *(The legacy process doc's "paiement 48h avant" may be unlawful here.)*
- [ ] A participant declaring an accessibility need → **référent handicap assigned, adaptation recorded, `adaptationTraceeAt` set.** A declared need with no traced response shows **red**.
- [ ] An intra parcours has **one** contractualisation. An inter parcours has **`Parcours.clientId = null`.**

---

## Slice 6 — Documents & signature

### Goal
Generate every legal document, from the frozen snapshot, with provenance.

### Scope
- `DocumentTemplate` — **versioned**, SUPER_ADMIN-editable, with legal mentions
- Generation: devis · convention · **contrat de formation pro** · convention ST · convocation · programme · attestation · **certificat de réalisation** · facture
- YouSign · Qonto · Chorus Pro **manual-upload flag**

### Acceptance
- [ ] Every generated document records its **`templateVersionId`** and its **`FormationVersion`**.
- [ ] Four conventions generate for the Bordeaux cohort — **one per payer**, each listing only its own participants.
- [ ] 🔴 **Groupe Cassous's attestation pack contains its 4 people and nobody else.** Sending it the Enedis employee's attestation is a cross-organisation personal-data disclosure. **The legacy process doc instructs exactly this. Do not follow it.**
- [ ] A `PARTICULIER` payer receives a **`CONTRAT_DE_FORMATION_PRO`**, not a convention.
- [ ] Alexandra **cannot** issue Bordeaux Métropole's invoice without `numeroEngagement` + `codeService`. Once issued in Qonto, she uploads to Chorus Pro and the app records **`chorusProSentAt`**. *(Manual upload. No API. Correct for V1.)*
- [ ] The convention carries PANDO's NDA (`11950745495`) — **the organisation's, not the formateur's.**
- [ ] The invoice carries the **VAT exonération mention**.
- [ ] Signed YouSign PDFs and Qonto invoices are **mirrored into PANDO's own bucket.** Proof never lives only in a third party.
- [ ] A signed document cannot be deleted — only **voided**.

---

## Slice 7 — 🔴 Sending & delivery proof

### Goal
**A convocation that bounced was not sent.**

This is a small slice with the highest consequence-per-line-of-code in the project.

### Scope
- Brevo (**transactional stream**) · manual send buttons
- **Delivery webhooks** → `DeliveryStatus`
- Retry: soft bounce ×2 / 24h → escalate

### Acceptance
- [ ] Alexandra clicks **Envoyer les convocations**. Eight go out. `CommunicationMessage` rows are created.
- [ ] ✅ `DELIVERED` (webhook) → **green. This is the proof. Nothing else is.**
- [ ] 🔴 **`HARD_BOUNCE` → the step shows `FAILED`, in RED, with an alert. It NEVER shows a green tick.**
- [ ] Soft bounce → auto-retry ×2 over 24h → then escalate.
- [ ] No webhook within 24h → **amber, "unconfirmed."** Not green.
- [ ] The audit view shows the **delivery** timestamp, not the send timestamp.

### ⭐ The test that matters
> Point a participant's email at a dead address. Send the convocation.
> **The dashboard must show a red failure — not a completed step.**
>
> If it shows green, you have built an audit trail that **looks complete and is not.** That is the single most dangerous failure mode in this system, and it is the one Codex is most likely to introduce, because "mark done after a successful API call" is the obvious implementation and it is **wrong**.

---

## Slice 8 — 🔴 Émargement · THE HARD ONE

### Goal
Sophie opens her phone at **08:50 in a room in Nantes with dead wifi**, and it works.

### Scope
- **PWA** — service worker + IndexedDB
- `Attendance` — participant × séquence × **demi-journée**
- Both signatures (participant + formateur), timestamp + IP
- Four proof types: signature · connexion · completion · compte rendu
- **Offline queue → sync on reconnect**
- 🔴 **Paper fallback** — generate → print → sign → scan → upload → `PAPER`

### Acceptance
- [ ] Sophie signs in by **magic link on her phone** (`sophieschacre@gmail.com`). She stays signed in for 30 days.
- [ ] She opens **Jour 2 · Matin**. Eight names.
- [ ] **Aeroplane mode.** Eight participants sign. She counter-signs. **Everything queues locally.**
- [ ] Wifi returns → all 16 signatures sync. `syncedAt` is set.
- [ ] 🔴 Marking someone `PRESENT` with **no** signature / connection / completion / scan → **`CHECK 7` rejects.** *This is what makes a false audit trail unwritable.*
- [ ] An absence **requires a justification** (`CHECK 6`).
- [ ] `hoursAttended` recomputes. **A participant who misses one demi-journée gets an attestation for 21h, not 24,5h. Real hours. Never contracted hours.**
- [ ] 🔴 **Paper fallback works end to end.** *A dead router must never block a session or destroy an audit trail. Do not remove this to keep the product "clean."*
- [ ] CLIC! with 6/7 present → **blocking alert requiring a pedagogical justification** (`requiresFullCohort`), not a routine absence note.

---

## Slice 9 — Amélioration continue

### Goal
Three small tables that **need time to fill credibly**.

### Why it ships in V1 despite being trivial
You cannot write twelve months of veille in November 2027. **An auditor knows exactly what a batch-created log looks like.** These start accreting the day the app goes live, or they are worthless.

### Scope
- `Reclamation` — intake → qualification → **response** → action
- `ActionAmelioration` — **named owner**, due date, **outcome**, verification
- `Veille` — légale / métier / pédagogique / handicap, with **`soWhat`**

### Acceptance
- [ ] Logging a réclamation takes **under a minute**.
- [ ] Logging a veille entry takes **under two minutes**. *(Design target. If it takes longer it will not be done, and Criterion 6 fails on an empty table.)*
- [ ] `ActionAmelioration` **requires** an owner (a person, not "the team"), a due date, and an **outcome that says what concretely changed.** *"Actioned" is not an outcome.*
- [ ] Overdue actions surface on the home screen.

---

## Slice 10 — Pilotage

### Goal
The home screen is a **risk radar**, not a vanity dashboard.

### Scope
- Alerts: unsigned conventions · missing participant lists · **hard bounces** · missing positionnements · overdue actions · expiring certifications
- Parcours at risk, ranked
- CA vs objective (`t-stat-xl`, Roboto Serif, tabular figures)
- Margin — computed with **formateur TTC + travel**, internal = 0

### Acceptance
- [ ] The money card is the **smallest** thing on the screen. The alerts are the biggest. *(Your own mockup got this right. Keep it.)*
- [ ] Every alert is **one click from the thing that needs doing**.
- [ ] Margin uses TTC for external formateurs and **0 for internal**.

---

## Codex working agreement

**One slice per PR.** No slice N+1 until slice N's boxes are all ticked.

**When blocked, stop and ask.** Open questions are in §15 and §18 of the reference doc. Never invent legal mentions, retention periods, indicator numbers, VAT rules or rétractation periods. **Plausible invention is worse than a question, because it produces code that looks right and documents that are wrong.**

**Every PR runs:** `prisma validate` · `tsc --noEmit` · **`real-data.ts` — 8/8 corruption paths closed.**

**When a slice needs a schema change,** update `PANDO_APP_REFERENCE.md` **first**, then the schema. The doc is what survives.

### The four things Codex will get wrong

Written down because they are predictable, and each one is expensive:

1. **Collapsing `Sequence` back into `startDate` / `endDate`.** It's simpler and it makes the app unable to run PANDO's actual products.
2. **Marking a step `DONE` when the API call succeeded.** Dispatch is not delivery.
3. **Simplifying the schema to match the current slice.** Every later slice then becomes a migration against live signed conventions.
4. **Locking all auth to the Google domain.** External formateurs can never log in, and you won't find out until slice 8.
