# AGENTS.md

**Read this file completely before writing any code. Re-read it before every schema or document change.**

You are building the operational system for **PANDO**, a Qualiopi-certified French management-training company. This app generates **legal documents** and produces the **evidence base for a certification audit**. Getting it wrong is not a bug — it is a failed audit or an unlawful contract.

---

## The one principle

> **PROOF-AS-EXHAUST.**
> Every operational step emits its own evidence as a by-product of the work.
> No artefact is producible without the work having happened.

Corollary, and it is the thing you are most likely to violate:

> **If you cannot produce a piece of evidence honestly, you produce no evidence at all.**
> A missing proof is a manageable gap. A *false* proof is a failed audit.

---

## Source of truth

| Document | Authority |
|---|---|
| `PANDO_APP_REFERENCE.md` | 🥇 **The domain. When anything conflicts with it, it wins.** |
| `prisma/schema.prisma` | The enforced model. Comments marked 🔴 explain *why* — read them. |
| `ARCHITECTURE.md` | Infrastructure, security, CI/CD. Its **domain model is superseded**. |
| `PANDO_design_system.html` | The visual language. Not optional. |

**If a task seems to require contradicting the reference doc: stop and ask. Do not resolve it yourself.**

---

## 🔴 NON-NEGOTIABLES

These exist because **each one prevents a specific defect found in PANDO's live data, or a specific legal failure.** They are not style preferences. Do not "improve" them.

### 1. Types

| Rule | Why |
|---|---|
| **SIRET, SIREN, NDA, phone, postcode are `String`. ALWAYS.** | The live spreadsheet stores SIRET as `5.0837292700014E13` and phone as `6.46633164E8`. The leading zero of `0646633164` is *gone*. A float cannot be written into these columns. |
| **Money is `Int`, in euro cents. NEVER `Float`.** | Floats do not add up. |
| **Dates are `DateTime`. Never strings.** | |

### 2. Deletion

- **No hard deletes. Ever.** Soft delete via `deletedAt`.
- **A signed document is a legal fact.** It is `isVoid`, never deleted.
- A cancelled invoice requires an **avoir** (credit note), not a deletion.

### 3. Status — the most dangerous rule in this file

> **A step whose email hard-bounced is `FAILED`. It is NEVER `DONE`.**

For Qualiopi, proof of **dispatch** is not proof of **delivery**. A convocation that bounced was **not sent**.

If you write code that marks a step complete because the send was *attempted*, you have created an audit trail that **looks complete and is not**. This is the single most dangerous failure mode in the entire system.

- `DELIVERED` (from the Brevo webhook) is the proof. Nothing else is.
- `HARD_BOUNCE` → alert, mark `FAILED`, surface it in red.
- Never default a status to success. Never "optimistically" mark done.

### 4. Documents

- **Generated from `FormationVersion` (the frozen snapshot), never from the live `Formation`.** Editing a programme in 2027 must not retroactively alter what a client signed in 2026.
- **Every document records its `templateVersionId`.** Provenance is not optional.
- **The programme is structured data, generated to PDF. It is never an uploaded PDF.**
- 🔴 **RGPD:** attestations, certificats and the questionnaire commanditaire are scoped to a **`Contractualisation`**, never to a **`Parcours`**. In a mixed-payer inter cohort, sending "all attestations to the client" discloses one company's employees to another. **The legacy process doc explicitly instructs this. Do not follow it.**

### 5. Derived fields — never entered by hand

```
Parcours.dateDebut   = MIN(sequences.date)
Parcours.dateFin     = MAX(sequences.date)
Parcours.totalHours  = Σ sequences.heures
Parcours.montantHT   = Σ contractualisations.montantHT
ParcoursParticipant.hoursAttended = Σ attendance where PRESENT
```

Two independent totals means one of them is a lie.

### 6. Attendance

- **The unit is the demi-journée.** Not the day. A 7h day = `MATIN` + `APRES_MIDI`.
- **Both parties sign** — participant *and* formateur, per demi-journée.
- **Offline is not optional.** Signatures queue in IndexedDB and sync on reconnect. This is architectural, not a feature.
- 🔴 **The paper fallback stays forever.** Generate → print → sign → scan → upload → `PAPER`. **A dead router must never block a session or destroy an audit trail. Do not remove this to keep the product "clean."**
- **The attestation reflects REAL hours attended, never contracted hours.**

### 7. Scheduling

- **The app owns the scheduling. Brevo is a pipe.** No J-7 / J-5 / +3-month logic inside Brevo automations.
- 🔴 **Cloud Tasks caps at 30 days.** Do **not** enqueue a 12-month cold evaluation. Persist `scheduledFor`; a **daily Cloud Scheduler sweeper** enqueues what is due in the next 24h.

### 8. Third parties never hold the proof

Mirror into PANDO's own Postgres and bucket:
- Survey **answers** (not just a `responseId` — if the account lapses, your evidence of learning evaporates)
- YouSign signed PDFs
- Qonto invoice PDFs

### 9. AI

An LLM may draft a relance email. **An LLM may never generate evidence.** Auditors are trained to detect proof written in a single uniform voice.

---

## Model traps

You will get these wrong unless you read them.

### `Parcours` ≠ `Sequence`

- **`Parcours`** = what is sold, contracted, invoiced, certified.
- **`Sequence`** = what is convened, attended, proved.

BAM! is **9 weeks / ~10 events / 4 modalities**. OPTA'S is **6 séquences, June 2026 → March 2027**. A single `startDate`/`endDate` cannot express either.

**Convocation (J-7) and émargement (J0) fire PER SÉQUENCE. Everything else fires once per parcours.**

### `Contractualisation` — a convention belongs to a *payer*, not a *parcours*

One inter cohort of 8 can have **5 payers → 5 conventions, 5 devis, 5 invoices, 5 signature chains**.

- `Parcours.clientId` is **nullable**. An inter parcours has no client.
- `Financement`, `priceMode` and `remise` live on **`Contractualisation`**. The BPF declares revenue *by funding origin*, and one cohort can carry three.

### `Situation` selects the legal document

Not demographic metadata.

| Payer | Document | Constraint |
|---|---|---|
| Employer | `CONVENTION_DE_FORMATION` | |
| **Individual, own funds** | 🔴 `CONTRAT_DE_FORMATION_PRO` | **10-day délai de rétractation.** Payment trigger = `max(J-2, retractationEndsAt)` — **never simply J-2.** The legacy process doc's "paiement 48h avant" may be **unlawful** here. |
| Public body | Convention + `BON_DE_COMMANDE` | Chorus Pro (below) |
| OPCO | Convention + dossier | |

### Public sector → Chorus Pro

**A PDF emailed to a Mairie is not a valid invoice.**

- `Client.isPublicSector` (from SIRENE: catégorie juridique `7xxx`) → the invoice is generated in **Qonto**, then **manually uploaded by Alexandra to the Chorus Pro portal**. The app records `chorusProSentAt`.
- **No Chorus Pro API integration in V1.** Manual upload is correct and legitimate.
- Block invoice generation until `numeroEngagement` + `codeService` are present.

### The phantom-convention rule

**An internal formateur cannot generate a convention de sous-traitance.** PANDO does not subcontract to its own owner.

The live sheet does exactly this: Alexandra (owner of PANDO) carries convention `2026-ST100`, describing a legal relationship that does not exist. `CHECK 1` makes it impossible. Do not work around it.

### `Formateur.tvaRate` is per formateur

Sophie: 0% (franchise en base). Anthony: 20%. Because PANDO makes VAT-exonerated supplies it very likely **cannot deduct** input VAT — so Anthony's 20% is an **absorbed cost**.

```
formateur cost:
  EXTERNE  → tarifJour × (1 + tvaRate) + forfaitDeplacement   [real cash out]
  INTERNE  → 0                                                 [notional only]
```

Compute margin on HT and you overstate it on every VAT-registered formateur. Count an internal formateur's day rate as a cost and you understate it on every parcours Alexandra delivers.

---

## Build strategy

### 🔴 Full schema. Partial UI.

**Migrate all 49 models in the first migration**, even though V1 touches ~20.

The schema is cheap to write and **brutal to change** once real signed conventions reference it. The UI is expensive and trivial to add to. **Do not "simplify" the schema to match the current slice.** You will not arrive at this on your own; it is stated here because it is the most consequential instruction in the file.

### Every slice must be able to run a real session in production

If Alexandra cannot use slice N for an actual BAM!, it is not a slice.

### V1 scope

**In:** clients · contacts · catalogue · formateurs · participants · **parcours + séquences** · contractualisation · document generation · **digital émargement (PWA, offline)** · réclamations · veille · actions d'amélioration.

**Sends are manual buttons** — but still logged, delivery-confirmed, and audit-evidenced. `FAILED` is still never `DONE`. You cannot automate a process nobody has run manually inside the system.

**Out (V2+):** the automation engine, Brevo scheduling, the Qualiopi computed layer, BPF export, the pedagogy tables (Carnet, plan 90j, défis — modelled, shipped empty).

---

## Stack

| | |
|---|---|
| Framework | Next.js (App Router) · TypeScript strict |
| DB | Postgres · **Prisma 6 — PIN IT.** Prisma 7 moved `datasource.url` out of the schema. |
| Host | Cloud Run · GCP |
| Auth | Auth.js — **Google OAuth (domain `pando-formation.fr`) for admins; email magic link for formateurs.** External formateurs use gmail / their own domains and **cannot** use Google OAuth. |
| Email | Brevo (transactional stream, separate from marketing) |
| Signature | YouSign |
| Invoicing | Qonto. Public sector → Qonto invoice, manual Chorus Pro upload. |
| PDF | Puppeteer — **in its own Cloud Run service.** Headless Chrome at 512 Mi in the app container will OOM. |
| Formateur UI | **PWA. Service worker + IndexedDB.** Offline émargement is architectural, from the first commit. |
| Styling | The PANDO design system. **Roboto + Roboto Serif — not Inter.** Use its tokens; do not fork them. |

---

## Definition of done

A slice is done when:

- [ ] It runs a **real** PANDO session end to end
- [ ] Every `CHECK` constraint holds under the real-data fixture
- [ ] No status is ever optimistically marked successful
- [ ] Every generated document records its template version
- [ ] Personal data is scoped to the payer, never the parcours
- [ ] `npx prisma validate` passes and `tsc --noEmit` is clean
- [ ] It uses design-system tokens, not ad-hoc values

---

## When you are unsure

**Ask. Do not guess.**

The domain is French training law and Qualiopi certification. Plausible-sounding invention is worse than a question, because it produces code that looks right and generates documents that are wrong.

Specifically, **never invent**: legal mentions, retention periods, Qualiopi indicator numbers, VAT rules, rétractation periods, or BPF categories.

Open questions live in **§15 and §18 of `PANDO_APP_REFERENCE.md`**. If your task depends on one of them, say so and stop.
