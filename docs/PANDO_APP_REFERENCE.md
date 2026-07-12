# PANDO — Application Reference

**Version:** 1.4
**Status:** Living document — the domain source of truth. `ARCHITECTURE.md` describes *how* we build; this describes *what* we are building and *why*.
**Companion documents:** `ARCHITECTURE.md` (infrastructure, stack, CI/CD, security), `PANDO_design_system.html` (visual language)
**Last updated:** 2026-07-11

> **Changelog v1.4** — Validated against a **mixed-payer inter cohort** (BAM! Bordeaux: 4 seats from one organisation + 3 individual seats, all employer-paid). The spine held; four field-level defects surfaced: **`Financement` moves from `Parcours` to `Contractualisation`** (the BPF declares revenue *by funding origin*, and one cohort can carry three) · **`priceMode` + `remise` move to `Contractualisation`** (a 4-seat payer negotiates; a 1-seat payer doesn't) · **`Parcours.montantHT` is derived** · 🔴 **RGPD attestation scoping** — the process doc instructs a cross-organisation data disclosure. See §4.4.
>
> **Changelog v1.3** — Reference data. Adds §4.12: **NSF spécialités** (seeded, FK — `champs` is a *function* axis, not a topic axis) · **NAF dual-storage** (rév. 2 + 2025 — 102 codes split, migration cannot be automated) · **SIRENE lookup** (kills the float-SIRET class of corruption and sources `isPublicSector` for Chorus Pro). Reference data lives in `prisma/seed/`, **not in this document**.
>
> **Changelog v1.2** — Validated against three end-to-end walkthroughs (BAM! inter · CLIC! intra · OPTA'S sous-traitance). The spine held; nine additions were required. Adds: **`Contractualisation`** (the payer axis — a convention belongs to a *payer × parcours* pairing, not to a parcours) · **`Situation` selects the legal document** (convention vs *contrat de formation professionnelle*, with its 10-day rétractation) · **public sector + Chorus Pro** · **the e-invoicing clock (1 Sept 2026)** · **`requiresFullCohort`** · **`SequenceLivrable`** (collective acquis) · **row-level confidentiality** · `bon de commande` · nullable client on inter.
>
> **Changelog v1.1** — Adds: engagement modes (PANDO as prime / as subcontractor) · roles as a set (+ COMMERCIAL) · formateur contract types and the phantom-ST-convention rule · VAT, travel allowance and true margin · `DocumentTemplate` · the pricing model · the free-form communication module · §16 exception paths · §17 data migration.

---

## Table of contents

1. [Purpose](#1-purpose)
2. [The lifecycle](#2-the-lifecycle)
3. [Roles and access](#3-roles-and-access)
4. [The domain model](#4-the-domain-model)
5. [The document chain](#5-the-document-chain)
6. [The automation engine](#6-the-automation-engine)
7. [Attendance and émargement](#7-attendance-and-émargement)
8. [Evaluations](#8-evaluations)
9. [The Qualiopi layer](#9-the-qualiopi-layer)
10. [Continuous improvement](#10-continuous-improvement)
11. [Financial and BPF](#11-financial-and-bpf)
12. [Integrations](#12-integrations)
13. [Deferred to V2](#13-deferred-to-v2)
14. [Acceptance criteria](#14-acceptance-criteria)
15. [Open questions](#15-open-questions)
16. [Exception paths](#16-exception-paths)
17. [Data migration](#17-data-migration)
18. [Pending — Alexandra](#18-pending--alexandra)

---

## 1. Purpose

### The one sentence

> **The app runs a formation at PANDO from the first devis to the twelve-month follow-up — executing every touchpoint, generating every document, tracking where every participant sits in the chain, and leaving a complete timestamped Qualiopi trail as a by-product of doing the work.**

### The governing principle

**Proof-as-exhaust.**

No step exists that produces work without producing evidence. No evidence exists that isn't the natural residue of real work.

Every design decision is subordinate to this. Where a feature would let an admin produce a document *without* the underlying work having happened, that feature is wrong. Where the work happens but no trace is emitted, the model is incomplete.

This is not a stylistic preference. Under the evolving Référentiel National Qualité, auditors are trained to detect retrospectively fabricated proof — evidence with suspiciously uniform authorship, surveys with implausible response rates, documents created in bulk after the fact. Evidence assembled *for* an audit does not survive scrutiny. Evidence emitted *by* the work does.

### Why now

The operation currently runs on a 48-column spreadsheet and a mail merge. It is already failing:

- A formateur's postal address is incremented row-by-row by an Excel autofill drag — wrong on 6 of 7 rows, and that address is printed onto a convention de sous-traitance.
- SIRETs are stored as floats (`5.0837292700014E13`).
- Phone numbers have lost their leading zeros (`6.46633164E8`).
- The same client appears with two different postcodes.
- Two sessions exist commercially with no participants recorded.

None of this is carelessness. It is the inevitable consequence of a spreadsheet being asked to be a database. And it scales with success: PANDO is at 211 k€ against a 250 k€ target, and every additional session multiplies the number of documents with legal and certification consequences that are generated from a corrupt source.

### The four jobs

| # | Job | What it means |
|---|-----|---------------|
| 1 | **Run the formation** | Not assist someone in running it. Run it. Every send, every alert, every deadline fires on its own. The admin's job becomes deciding, not remembering. |
| 2 | **Prove the formation** | Qualiopi — as a by-product of job 1, not as a parallel activity. The audit becomes a filter and an export. |
| 3 | **Make PANDO's method deliverable** | The differentiator is *apprentissage vécu dans le flux du travail*: positionnement, capsules, défis intersession, flash coaching, Carnet PANDO, plan d'action 90 jours, REX. A nine-week BAM! is operationally brutal. The app is what makes the method repeatable rather than heroic. |
| 4 | **Show the business** | CA vs objective, pipeline, capacity — and above all, *which sessions are at risk right now*. |

### What this is not

- **Not a CRM with a Qualiopi tab.** That is two systems, and the second one always rots.
- **Not a document folder.** Storing PDFs proves nothing. The proof is the *link* between an artefact, a moment, a person and an indicator.
- **Not an AI product.** An assistant that drafts a relance email is fine. Anything that generates evidence is a liability.
- **Not (in V1) connected to the public website.** See §13.

---

## 2. The lifecycle

This is the spine. Every entity, screen and automation in this document exists to serve one of these stages.

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  1. DEMANDE                                                             │
  │     Discovery call → analyse du besoin → proposition pédagogique        │
  │     & commerciale                                                       │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  2. CONTRACTUALISATION                                                  │
  │     Devis (Qonto) → SIGNATURE #1 (YouSign) → participant list received  │
  │     → Convention (generated, filled with participant data)              │
  │     → SIGNATURE #2 (YouSign) → Facture (Qonto)                          │
  │     → Convention de sous-traitance (if external formateur)              │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  3. PRÉPARATION                                                         │
  │     Programme sent → Convocation (J-7, per séquence) → Test de          │
  │     positionnement → accessibility adaptation (if declared)             │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  4. RÉALISATION                                                         │
  │     Per séquence: émargement (demi-journée) · défis intersession ·      │
  │     flash coaching · capsules e-learning · satisfaction mi-parcours     │
  │     · absence / abandon handling                                        │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  5. ÉVALUATION & CLÔTURE                                                │
  │     Évaluation des acquis → Attestation nominative → Certificat de      │
  │     réalisation (financeur) → Supports → Évaluation formation/formateur │
  │     → Questionnaire commanditaire / formateur / financeur               │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  6. SUIVI                                                               │
  │     Évaluations à froid — 3 / 6 / 12 months (configurable per parcours) │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  7. AMÉLIORATION CONTINUE                          [always-on, not      │
  │     Réclamations · actions correctives · veille     stage-bound]        │
  └─────────────────────────────────────────────────────────────────────────┘
```

### Two structural truths about this lifecycle

**(a) It is not a 1–3 day seminar.**

BAM! runs **nine weeks**. POP! runs **eighteen**. CLIC! is three demi-journées. WOW! is a variable-duration coaching contract. The lifecycle above executes once per *parcours*, but stages 3 and 4 repeat **per séquence** — and a single BAM! has roughly ten séquences across four different modalities.

Any model with a single `startDate` / `endDate` cannot express this. See §4.

**(b) It is tracked per participant, not per session.**

Participant A is convoqué ✓, positionnement ✓, present J1, absent J2, acquis pending.
Participant B is complete.

The session's status is **derived** from the participants' states, not the reverse. This is the difference between a dashboard that says "session in progress" and one that says "3 participants have not completed their positionnement — the convocation for J2 goes out tomorrow."

---

## 3. Roles and access

### 🔴 Roles are a **set**, not a field

A user holds *one or more* roles. This is not theoretical:

- **Alexandra** — owner of PANDO. She is `SUPER_ADMIN` **and** `FORMATEUR`. She needs the admin dashboard *and* the émargement view for the parcours she delivers herself.
- **Yann** — `COMMERCIAL`. Sales, not delivery. He is the owner of the `Demande` pipeline — which is what `Client.assignedTo` ("moi / Yann") always was.
- **External formateurs** — `FORMATEUR` only.

`User.roles: Role[]`. Permissions are the union.

| Role | Auth mechanism | Can see | Can do |
|------|---------------|---------|--------|
| **SUPER_ADMIN** | Google OAuth (PANDO domain) | Everything | Everything, plus: catalogue CRUD, user management, **document templates**, référentiel versions, automation templates |
| **ADMIN** | Google OAuth (PANDO domain) | Everything operational | Day-to-day ops: clients, demandes, parcours, participants, documents, invoicing. Cannot alter the catalogue, templates or the référentiel. |
| **COMMERCIAL** 🔴 | Google OAuth (PANDO domain) | Clients, demandes, devis, own pipeline; parcours read-only | Create and manage demandes, analyse du besoin, propositions, devis. **Open question:** does the commercial role need the Qualiopi/document layer, or is it scoped to pre-contract only? See §15. |
| **FORMATEUR** | **Email magic link** | Only their own assigned parcours | View participant lists, view/download the programme, open and run the digital émargement, submit their own post-session questionnaire, upload supports |
| **PARTICIPANT** | Single-use signed token (no account) | Only their own action | Sign, complete a survey, download their attestation |
| **CLIENT** | Single-use signed token (no account) | Only their own action | Sign a convention, complete the questionnaire commanditaire, download attestations |
| **AUDITEUR** | Time-boxed read-only token | Scoped selection of parcours | Read-only. Every evidence trail, no mutation. See §9. |

### Notes

**Domain:** the operational domain is `pando-formation.fr`. (`ARCHITECTURE.md` currently restricts OAuth to `pando.fr` — this must be corrected.)

**Why formateurs get a real session, not a one-shot token.** Formateurs open the app in a training room, on a phone, on the morning of J1, on unreliable wifi. A single-use token dies on first use and is useless for this. Magic link → single-use, 15-minute validity, sets a **real session cookie**, 30 days with "remember this device".

Only an email address already present on a `Formateur` record may request a link. Rate-limited. Revocable.

**Two audiences, two mechanisms, never conflated.** Formateurs have sessions. Participants and clients have tokens.


---

## 4. The domain model

### 4.1 The central split: Parcours ↔ Séquence

This is the single most important structural decision in the system. Everything downstream inherits it.

| | **Parcours** | **Séquence** |
|---|---|---|
| **Is** | What is sold, contracted, invoiced, certified | What is convened, attended, proved |
| **Owns** | Convention · devis · facture · analyse du besoin · positionnement · évaluation des acquis · attestation · certificat de réalisation · évaluations à froid | Convocation · émargement / trace d'activité · formateur assignment · lieu · modalité · hours |
| **Cardinality** | One per commercial engagement | 1..n per parcours |

**Why it is not optional:**

- *OPTA'S* (from live data): six sessions, 16 June 2026 → 18 March 2027. A single date pair loses eight of the ten dates.
- *BAM!*: kick-off · capsule e-learning · Jour 1 · défi 1 · étude de cas collective · Jour 2 · défi 2 · flash coaching · Jour 3 · défi 3 · travail collectif autonome · visio REX. **One convocation and one émargement cannot cover this.**
- A convocation must go out J-7 before **each** séquence, not once before the whole parcours.
- The proof of attendance differs by séquence modality: signature (présentiel), connection log (distanciel), completion trace (e-learning), session record (coaching).

### 4.2 🔴 Engagement modes — PANDO as prime, PANDO as subcontractor

Because of the *appel d'offre* model, **PANDO is not always the prime contractor.** This is a second commercial mode, and it changes the document chain, the pricing, the BPF line and possibly the Qualiopi obligation.

| | **PRESTATAIRE_DIRECT** (prime) | **SOUS_TRAITANT** |
|---|---|---|
| Who holds the convention with the end client | **PANDO** | The **donneur d'ordre** (e.g. OPTA'S) |
| Who PANDO invoices | The client | The donneur d'ordre |
| Whose participants attend | The client's | The **bénéficiaire's** (e.g. CAF 92) |
| Pricing | **Retail** day rate | **Wholesale** day rate |
| PANDO signs | Convention de formation (as OF) | Convention de **sous-traitance** (as *sous-traitant*) |
| BPF line | Produits — entreprises | Produits — **organismes de formation** |

**The live proof.** The OPTA'S parcours: client OPTA'S (Besançon), *lieu* CAF des Hauts-de-Seine (Nanterre), day rate **700 €** — exactly PANDO's wholesale formateur rate, against **1 535 €** retail for Le 104. OPTA'S won the CAF contract; PANDO delivers it.

**Three parties, not two:**

| Party | Meaning | Field |
|---|---|---|
| **Donneur d'ordre** | Holds the convention with the end client. PANDO, or a third party. | `Parcours.donneurOrdreId` (null when PANDO is prime) |
| **Commanditaire** | Who PANDO invoices | `Parcours.commanditaireId` |
| **Bénéficiaire** | Whose people are trained; where the participants come from | `Parcours.beneficiaireId` |

In direct mode: commanditaire = bénéficiaire, donneur d'ordre = null.
In subcontractor mode: all three can differ.

```
Parcours.pandoRole: PRESTATAIRE_DIRECT | SOUS_TRAITANT
```

> **⚠️ Two questions for the certifier, not for the developer:**
> 1. When PANDO acts as *sous-traitant*, does the certification obligation sit with the donneur d'ordre (who receives the mutualised funds)? Standard reading says yes — but PANDO's own audit may still sample these prestations as actions it delivered.
> 2. When PANDO is *prime* and subcontracts delivery to an external formateur, PANDO must evidence that the subcontractor meets the référentiel requirements. This is what `FormateurCompetence` exists for.
>
> **Verify both with the certifying body.** The app models the distinction; the obligations attached to it are a compliance decision.

### 4.3 🔴 Pricing, cost and true margin

The current model has a single `montantHT` on the parcours. Reality is richer, and getting it wrong makes the margin dashboard lie.

**Price modes:**

| Mode | Use | From live data |
|---|---|---|
| `FORFAIT_JOUR` | Intra — day rate × days × sessions | Le 104: 1 535 €/j · OPTA'S: 700 €/j × 2j × 6 sessions = 8 400 € |
| `PAR_PERSONNE` | Inter | POP! inter: 510 €/pers/jour |
| `NEGOCIE` | Overrides both | Appels d'offre |

**VAT — the part that costs money.**

PANDO does **not** bill VAT: formation professionnelle continue is exonerated (art. 261-4-4° a CGI). But its formateurs are not all in the same regime:

| Formateur | VAT | Day cost to PANDO |
|---|---|---|
| Sophie SCHACRE-LAFFONT | 0 % (franchise en base) | 700 € + 20 € travel = **720 €** |
| Anthony PEREIRA | **20 %** | 840 € TTC + 20 € travel = **860 €** |
| Alexandra GENTIL | n/a — internal | **0 € cash out** |

> 🔴 **Because PANDO makes exonerated supplies, it very likely cannot deduct the input VAT it pays.** Anthony's 20 % is not a pass-through — it is an **absorbed cost**. His day genuinely costs 860 €, not 720 €. *(Confirm with the accountant, but this is the standard consequence of the exonération.)*

**Therefore:**

```
margin = clientPrice − Σ(formateur cost)

where formateur cost =
   EXTERNE  → dayRate × (1 + tvaRate) + forfaitDeplacement      [real cash out]
   INTERNE  → 0                                                  [notional only]
```

🔴 **Computing margin on HT will systematically overstate it on every VAT-registered formateur.**
🔴 **Counting an internal formateur's day rate as a cost will systematically understate margin on every parcours Alexandra delivers.** The OPTA'S parcours has *no* external formateur cost at all — the 700 €/day in the sheet is an internal transfer, not a cash outflow.

**Fields:**

| Entity | Field | Notes |
|---|---|---|
| `Formateur` | `tvaRate` | 0 or 0.20 — **per formateur**, never global |
| `Formateur` | `forfaitDeplacement` | 20 € / 0 € — absent from the model today |
| `Parcours` | `priceMode` | `FORFAIT_JOUR` / `PAR_PERSONNE` / `NEGOCIE` |
| `Parcours` | `remise` | Negotiated discount |
| `Parcours` | `montantHT` | PANDO never charges VAT — `montantTTC = montantHT` |

The client invoice template must carry the **exonération mention** (art. 261-4-4° a CGI). That is a legal mention that can change — which is precisely why `DocumentTemplate` must be versioned. See §5.

### 4.4 🔴 `Contractualisation` — the payer axis

**A convention does not belong to a parcours. It belongs to a *payer × parcours* pairing.**

This is the correction the BAM! inter walkthrough forced. v1.1 had a single `Parcours.commanditaireId`. But an inter cohort of 8 can have **5 different payers** — 5 conventions, 5 devis, 5 invoices, 5 signature chains, running in parallel on one parcours.

```
Parcours ──1..n──> Contractualisation ──1..n──> ParcoursParticipant
                        │
                        ├── payerType    ORGANISATION | INDIVIDU | OPCO
                        ├── payerClientId / payerParticipantId
                        ├── signataireId (ClientContact)
                        ├── devis / bonDeCommande
                        ├── convention  OR  contrat  (see 4.7)
                        └── facture
```

| Track | Contractualisations |
|---|---|
| **INTRA** | 1 (the client) |
| **SOUS_TRAITANCE** | 1 (the donneur d'ordre) |
| **INTER** | 1..n — **one per payer** |

Consequences:

- 🔴 `Parcours.commanditaireId` → **removed**. Replaced by `Contractualisation`.
- 🔴 `Parcours.clientId` is **nullable** — an inter parcours has no client.
- The contractualisation strip is the admin's primary pre-flight screen: one row per payer, one status chain each.
- A parcours cannot move to `EN_COURS` while any contractualisation is unsigned (force-start by SUPER_ADMIN only, logged — see §16.4).

#### 🔴 v1.4 — three things belong to the payer, not the parcours

Tested against a real mixed cohort: **BAM! Inter Bordeaux** — 7 participants, 4 payers. Groupe Cassous sends 4 people; three other organisations send 1 each. All employer-paid.

A block booking needs no new concept — it is one `Contractualisation` with four participants attached. But it exposed three fields sitting on the wrong table:

| Moved | From | To | Why |
|---|---|---|---|
| **`Financement`** | `Parcours` | `Contractualisation` | 🔴 Groupe Cassous funds through its OPCO. Cabinet Mérignac pays direct. Bordeaux Métropole is public money. **Three funding origins, one parcours — and the BPF declares revenue *by* funding origin.** Hang it off the parcours and every mixed-payer inter session is misdeclared. It is a legal filing. |
| **`priceMode` + `remise`** | `Parcours` | `Contractualisation` | A payer buying 4 seats negotiates a volume discount a 1-seat payer does not get. **The deal belongs to the payer.** `Parcours` keeps the list price. |
| **`montantHT`** | entered | **derived** | `Parcours.montantHT = Σ contractualisations`. Two independent totals means one of them is a lie. Same treatment `dateDebut` / `dateFin` already get. |

#### 🔴 v1.4 — RGPD: the process doc instructs a data breach

> *"Envoi de toutes les attestations de formation des participants : client."* — PROCESS FORMATION V1

In a mixed-payer cohort that sends **Groupe Cassous the attestations of Enedis's employee.** Cross-organisation disclosure of personal data, with no legal basis.

> **RULE: a payer receives ONLY the artefacts of the participants it paid for.**
> `ATTESTATION_FORMATION`, `CERTIFICAT_REALISATION` and `QUESTIONNAIRE_COMMANDITAIRE` are addressed to a **`Contractualisation`**, never to a **`Parcours`**. [CHECK 14]

*(Open: the feuille d'émargement lists every name in the room. If an OPCO demands it as proof, whose names does it show? Standard practice treats it as an internal document — confirm with the OPCOs PANDO actually invoices. → §15 Q7.)*

#### Track note — which alert fires where

`LISTE_PARTICIPANTS_ALERT` (J-12) is an **INTRA** trigger. In INTER there is no "list received" event — participants enrol individually over time. The inter equivalent is `INTER_MINIMUM_ALERT` (J-14, under-subscription). Both are in the enum; each belongs to one track.

### 4.5 🔴 `Situation` selects the legal document

The `Situation` field in the live spreadsheet (`salarié.e` / `particulier` / `indépendant`) is **not demographic metadata. It selects the contract.**

| Payer | Document | Constraint |
|---|---|---|
| **Employer** (organisation) | `CONVENTION_DE_FORMATION` | Signed by the employer's `SIGNATAIRE` |
| **Individual, own funds** | 🔴 `CONTRAT_DE_FORMATION_PROFESSIONNELLE` | **10-day délai de rétractation. No payment may be demanded during it, and there is a legal cap on any up-front deposit.** |
| **OPCO** | Convention + funding dossier | |
| **Public body** | Convention + `BON_DE_COMMANDE` | See §4.6 |

> 🔴 **This directly contradicts the process doc.** *"Paiement doit être effectué 48h avant le début de la formation"* may be **unlawful** for a self-paying individual whose 10-day rétractation window has not expired.
>
> **Rule:** if `payerType = INDIVIDU`, the payment trigger is `max(J-2, rétractation_end)` — and if the parcours starts inside the rétractation window, the app must **block enrolment or waive the deposit**, not silently invoice.
>
> ⚠️ **Confirm the exact deposit cap and rétractation mechanics with the accountant.** The app models the constraint; the figures are a compliance input.

### 4.6 🔴 Public sector, Chorus Pro, and the e-invoicing clock

**A PDF emailed to a Mairie is not a valid invoice.**

Since **1 January 2020**, every supplier to the State, local authorities and public establishments must transmit invoices through **Chorus Pro**. Qonto does not do this. Mairie de Bordeaux and CAF des Hauts-de-Seine are already in PANDO's data.

| Field | Entity | Notes |
|---|---|---|
| `isPublicSector` | `Client` | 🔴 Derived from legal category / SIRET; drives the whole branch |
| `numeroEngagement` | `Contractualisation` | Required by Chorus Pro |
| `codeService` | `Contractualisation` | Required by Chorus Pro |
| `bonDeCommandeId` | `Contractualisation` | Public procurement does not sign devis |

When `Demande.source = APPEL_OFFRE`, the **devis is optional** — exactly as the process doc already states.

#### The clock

France's e-invoicing reform: from **1 September 2026, every VAT-assujettie business must be able to *receive* structured electronic invoices** (Factur-X / UBL / CII), regardless of size. Issuing becomes mandatory for PME/TPE on **1 September 2027**. Invoices must transit a *Plateforme Agréée*.

Nuance: operations *exonerated* under art. 261 CGI may sit outside the **issuing** mandate — but PANDO still **buys** (from Anthony, from tooling, from suppliers), and **reception capability is not optional**.

> 🔴 **Architectural fork, and it lands before this app ships.**
> Build invoicing on **Qonto alone** — and bolt on Chorus Pro + a Plateforme Agréée later?
> Or build on a **Plateforme Agréée from day one** and treat Qonto as the bank?
>
> **This is an accountant question, not a developer question. Ask it this week.**

### 4.7 🔴 Confidentiality — a row-level boundary, not a UI toggle

This surfaced twice, from two directions, which is why it belongs in the schema rather than in a permissions middleware:

- **WOW!** — the product doc calls confidentiality *"absolue"* and non-negotiable. Coaching comptes rendus.
- **CLIC!** — a CODIR admitting *"nos arbitrages se font par évitement"* is not something the Mairie's comms team, or PANDO's commercial, should ever read.

```
confidentiality: PUBLIC | INTERNE | RESTREINT | CONFIDENTIEL
```

| Level | Visible to |
|---|---|
| `PUBLIC` | Everyone with access to the parcours |
| `INTERNE` | PANDO staff (ADMIN, SUPER_ADMIN, COMMERCIAL) |
| `RESTREINT` | The assigned formateur · the participants concerned · SUPER_ADMIN. **Not COMMERCIAL.** |
| `CONFIDENTIEL` | The coach and the beneficiary **only**. Not even SUPER_ADMIN reads the content — only that the séance occurred. |

Applies to: `SequenceLivrable`, `CompteRendu`, `AnalyseBesoin`, `CarnetEntry`, `Reclamation`.

🔴 **This cannot be bolted on.** It is a row-level access predicate and it must exist in the schema from day one.

→ WOW!'s exact level is `PENDING · ALEXANDRA`. See §18.

### 4.8 🔴 `SequenceLivrable` — collective acquis

CLIC! produces **three règles du jeu**, a **référentiel décisionnel (3 principes partagés)** and **collective commitments**. These *are* the acquis. And they belong to nobody.

The product doc is explicit: *"Travail centré sur le collectif, pas sur les individus."* So the évaluation des acquis for CLIC! **cannot be an individual quiz.** The proof of learning is a cohort-level artefact, co-produced in the room.

| Field | Notes |
|---|---|
| `sequenceId` | FK |
| `type` | `REGLES_DU_JEU` / `REFERENTIEL_DECISIONNEL` / `ENGAGEMENTS_COLLECTIFS` / `AUTRE` |
| `content` | Structured — the actual principles |
| `validatedBy` | Participant[] — who signed off |
| `confidentiality` | 🔴 Default `RESTREINT` for CLIC! |

Each participant still receives a **nominative attestation** — the law requires it. But the *acquis* sit at cohort level, and the Qualiopi evidence link points at the livrable.

`Evaluation` therefore needs a `scope: INDIVIDUEL | COLLECTIF`.

### 4.9 🔴 `requiresFullCohort`

CLIC! is the only programme where an absence breaks the **pedagogy**, not the paperwork. The product doc: *"Format intra uniquement — collectif complet requis."*

```
Formation.requiresFullCohort: Boolean
```

When true:
- `minParticipants = maxParticipants` (the exact instance, not a range)
- An incomplete émargement raises a **blocking alert requiring a pedagogical justification** — not a routine absence note
- The justification is itself Qualiopi evidence (Criterion 3: adaptation)

### 4.10 Entity map

```
  Client ──┬── ClientContact (role: PRINCIPAL / ADMIN / SIGNATAIRE)
           │
           └── Demande ──── Parcours ──┬── Sequence ──── Attendance
                                       │                    │
                                       ├── ParcoursParticipant ── Participant
                                       │                    │
                                       ├── ParcoursFormateur ─── Formateur
                                       │
                                       ├── Document
                                       ├── Evaluation
                                       ├── AutomationJob
                                       ├── CommunicationLog
                                       └── Financement ──── Financeur

  Formation (catalogue, versioned) ──── FormationVersion ──┐
                                                            └─→ snapshot onto Parcours

  Referentiel ──── Critere ──── Indicateur ──── EvidenceLink ──→ any artefact

  Reclamation ──── ActionAmelioration
  Veille
  AuditLog
```

### 4.11 Core entities

---

#### `Client`

The organisation. Never a person.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `companyName` | String | |
| `siret` | **String** | 14 chars. **Never numeric.** Unique. |
| `nafCode` | String? | |
| `sector` | String? | Derived from NAF (see NAF correspondence table) |
| `region` | String? | PANDO region |
| `address`, `postalCode`, `city` | String? | `postalCode` is a **String** — leading zeros matter |
| `status` | Enum | `PROSPECT` / `ACTIF` / `EN_PAUSE` |
| `origin` | Enum | `DIRECT` / `APPEL_OFFRE` / `RESEAU` |
| `assignedToId` | FK → User | Not a free-text `'moi' | 'yann'` string |
| `comments` | Text? | |

---

#### `ClientContact` 🔴 *new — currently flattened into `Client` fields*

The live data clearly distinguishes the operational correspondent (*Marion, Chargée de développement RH*) from the signatory (*Bénédicte, DRH*). Flattening these into `contactEmail` + `adminEmail` makes turnover, dual signatories, and per-person signature attribution impossible.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `clientId` | FK → Client | |
| `role` | Enum | `PRINCIPAL` / `ADMINISTRATIF` / `SIGNATAIRE` — a contact may hold several |
| `civilite` | Enum | Madame / Monsieur / Autre |
| `firstName`, `lastName` | String | 🔒 RGPD |
| `fonction` | String? | |
| `email` | String | 🔒 RGPD |
| `phone` | String? | 🔒 RGPD — **String**, leading zeros |
| `isActive` | Boolean | Handles turnover without destroying historical documents |

---

#### `Formation` — the catalogue *(SUPER_ADMIN CRUD)*

**Not** limited to BAM! / POP! / CLIC! / WOW!. Live data contains *Médiation et gestion des conflits*, *Bien-être au travail et réguler son stress*, *Devenir manager du changement*. The four branded programmes are a **marketing layer over a wider catalogue**.

The programme is **structured data, never an uploaded PDF.** The PDF sent with the convocation, and (in V2) the public web page, are both *generated* from these fields. An uploaded PDF is a silent drift machine — and Criterion 1 checks precisely that what is published matches what is delivered.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `internalCode` | String | Unique |
| `title` | String | |
| `subtitle` | String? | |
| `brandProgramme` | Enum? | `BAM` / `POP` / `CLIC` / `WOW` / `null` — marketing layer, nullable |
| `durationHours` | Decimal | 🔴 **Required.** Certificats and the BPF are denominated in hours. |
| `durationDays` | Decimal | |
| `format` | Enum | présentiel / distanciel / e-learning / combinations |
| `prerequisites` | Text | |
| `targetAudience` | Text | |
| `pedagogicObjectives` | String[] | Array — **not** `objectif1/2/3`. BAM! has five. |
| `methodesPedagogiques` | Text | Criterion 4 |
| `modalitesEvaluation` | Text | Criterion 3 |
| `delaiAcces` | String | 🔴 Criterion 1 — must be published |
| `accessibilite` | Text | 🔴 Accessibility statement — Criterion 3 |
| `priceIntraPerDay` | Int | euro cents |
| `priceInterPerPerson` | Int | euro cents |
| `bpfIncluded` | Boolean | |
| `prestationCode` | Enum | BPF prestation category |
| `specialiteId` | 🔴 **FK → NsfSpecialite** | Seeded taxonomy — not a String. See §4.12. |
| `tauxSatisfaction`, `tauxReussite` | Decimal? | Published results — the direction of travel of the référentiel |

---

#### `FormationVersion` 🔴 *new*

`Formation` is **immutable once used**. Editing a programme's objectives in 2027 must not retroactively alter what a client signed in 2026 — auditors check exactly this.

Every edit creates a new `FormationVersion`. **At contract time, the version is snapshotted onto the `Parcours`.** The parcours carries its own frozen copy of what was sold.

---

#### `Demande` 🔴 *new — no home in the current model*

The commercial pipeline. Today `Client.status` is a label, not a pipeline, and the website's discovery call lands nowhere.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `clientId` | FK → Client | |
| `source` | Enum | `APPEL_DECOUVERTE` / `APPEL_OFFRE` / `RESEAU` / `INBOUND_SITE` |
| `status` | Enum | `NOUVELLE` / `ANALYSE` / `PROPOSITION_ENVOYEE` / `GAGNEE` / `PERDUE` |
| `analyseBesoinId` | FK → AnalyseBesoin | |
| `parcoursId` | FK? → Parcours | Set on win |
| `lostReason` | Text? | |

---

#### `AnalyseBesoin` 🔴 *new — currently a checkbox with a timestamp*

**This is the most consequential artefact in the entire system**, and it is currently modelled as a manual to-do flag and an optional PDF upload.

It is the document that justifies every adaptation PANDO makes — and under the incoming référentiel, individualisation moves to the centre of the audit. It must be **structured data at the demande stage**, feeding the proposition, the programme adaptation, and the positionnement.

| Field | Type | Notes |
|-------|------|-------|
| `contexteOrganisation` | Text | |
| `problematique` | Text | The real problem, in the client's words |
| `objectifsClient` | Text[] | |
| `profilsCibles` | Text | |
| `contraintes` | Text | Time, budget, geography, availability |
| `indicateursSucces` | Text[] | How the client will know it worked |
| `adaptationsProposees` | Text | 🔴 What PANDO changed *because of* the above — the actual proof of individualisation |
| `completedBy` | FK → User | |
| `completedAt` | DateTime | |

---

#### `Parcours` — replaces the current flat `Session`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `reference` | String | e.g. `2026-F101` — carry over the existing scheme |
| `formationVersionId` | FK | 🔴 Snapshot — frozen at contract |
| `demandeId` | FK? | |
| ~~`commanditaireId`~~ | — | 🔴 **Removed in v1.2.** Payers live on `Contractualisation` — see §4.4. |
| `clientId` | FK? → Client | 🔴 **Nullable.** An INTER parcours has no client. |
| `beneficiaireId` | FK? → Client | 🔴 Where it happens, if different. *OPTA'S buys; CAF 92 hosts.* |
| `donneurOrdreId` | FK? → Client | The prime, when `pandoRole = SOUS_TRAITANT` |
| `pandoRole` | Enum | `PRESTATAIRE_DIRECT` / `SOUS_TRAITANT` — see §4.2 |
| `minParticipants`, `maxParticipants` | Int | INTER; equal when `requiresFullCohort` |
| `track` | Enum | `INTRA` / `INTER` |
| `status` | Enum | `BROUILLON` / `CONFIRME` / `EN_COURS` / `TERMINE` / `ANNULE` |
| `dateDebut`, `dateFin` | Date | **Derived** from séquences, not entered |
| `totalHours` | Decimal | Derived |
| `montantHT`, `tva`, `montantTTC` | Int | euro cents |
| `delaiReglement` | Int | days |
| `qontoQuoteId`, `qontoInvoiceId` | String? | Idempotency locks — see `ARCHITECTURE.md` §10 |

---

#### `Sequence` 🔴 *new*

One event. One convocation. One attendance record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `parcoursId` | FK | |
| `ordre` | Int | |
| `titre` | String | e.g. *"Jour 2 — Structurer l'organisation de son équipe"* |
| `type` | Enum | `PRESENTIEL` / `DISTANCIEL` / `ELEARNING` / `COACHING` / `TRAVAIL_AUTONOME` |
| `date` | Date | |
| `demiJournees` | Enum[] | `MATIN` / `APRES_MIDI` — the legal unit |
| `heures` | Decimal | |
| `lieu` | Text? | |
| `formateurId` | FK? → Formateur | **Per séquence** — POP! may involve several |
| `preuveType` | Enum | `SIGNATURE` / `CONNEXION` / `COMPLETION` / `COMPTE_RENDU` |

---

#### `Participant`

| Field | Type | Notes |
|-------|------|-------|
| `civilite`, `firstName`, `lastName` | | 🔒 RGPD |
| `email` | String | 🔒 RGPD |
| `address`, `postalCode`, `city` | String? | 🔒 RGPD |
| `fonction` | String? | |
| `situation` | Enum | `SALARIE` / `PARTICULIER` / `INDEPENDANT` |
| `clientId` | FK? → Client | |

---

#### `ParcoursParticipant` — **the per-participant state machine** 🔴

This is the join table, and it is where the app's real intelligence lives. The mockup currently tracks state only at session level; this is what makes per-participant tracking possible.

| Field | Type | Notes |
|-------|------|-------|
| `parcoursId`, `participantId` | FK | |
| `status` | Enum | `INSCRIT` / `CONVOQUE` / `EN_COURS` / `TERMINE` / `ABANDON` / `ABSENT` |
| `abandonReason` | Text? | 🔴 An abandon is a *managed event*, not a gap. Traced, with a documented response. |
| `positionnementStatus` | Enum | |
| `acquisStatus` | Enum | |
| `attestationIssuedAt` | DateTime? | |
| `hoursAttended` | Decimal | Derived from `Attendance` |
| `besoinAccessibilite` | Text? | 🔒 RGPD — **sensitive.** Declaration only. |
| `adaptationProposee` | Text? | 🔴 What was actually offered |
| `adaptationTraceeAt` | DateTime? | 🔴 The proof that the declaration was *answered* |
| `referentHandicapId` | FK? → User | |
| `contractualisationId` | FK → Contractualisation | 🔴 **v1.2.** Which payer covers this participant. See §4.4. |
| `situation` | Enum | `SALARIE` / `PARTICULIER` / `INDEPENDANT` — 🔴 **selects the legal document.** See §4.5. |
| `paymentStatus`, `paidAt` | | 🔴 If `payerType = INDIVIDU`, the payment trigger is `max(J-2, rétractation_end)` — **never simply J-2.** |

> **On accessibility:** a free-text field on the participant is a *note*, not a process. The chain must be: **need declared → référent handicap assigned → adaptation proposed → response traced**. A declared need with no traced response is a non-conformity.

---

#### `Formateur`

| Field | Type | Notes |
|-------|------|-------|
| `civilite`, `firstName`, `lastName` | | 🔒 RGPD |
| `email` | String | 🔒 RGPD — magic-link identity |
| `phone` | String? | 🔒 RGPD — String |
| `address` | Text? | 🔴 **The field the spreadsheet corrupted.** Prints onto the convention de sous-traitance. |
| `contractType` | **Enum** | 🔴 `INTERNE_DIRIGEANT` / `INTERNE_SALARIE` / `EXTERNE_PRESTATAIRE` — replaces the boolean `isInternal` |
| `siren` | String? | 🔴 **External only.** Never numeric. |
| `nda` | String? | 🔴 **External only.** See the NDA rule below. |
| `tvaRate` | Decimal | 🔴 `0` or `0.20` — **per formateur** |
| `forfaitDeplacement` | Int | 🔴 euro cents — 20 € / 0 € in live data |
| `tarifJour` | Int | euro cents |
| `isQualiopiCertified` | Boolean | External only — matters for CPF-funded actions |
| `expertises` | String[] | |
| `yearsFormation`, `yearsManagement` | Int? | |
| `availabilityNotes` | Text? | |

#### 🔴 The phantom-convention rule

**An internal formateur cannot generate a convention de sous-traitance.** PANDO does not subcontract to its own owner.

The live sheet does exactly this: Alexandra GENTIL — owner of PANDO, acting under PANDO — carries convention number **`2026-ST100`**. That document describes a legal relationship that does not exist. The app must make it **impossible to generate**.

```
if formateur.contractType != EXTERNE_PRESTATAIRE:
    → no convention de sous-traitance
    → no ST invoice
    → no SIREN / NDA of their own
    → formateur cost = 0 (notional day rate only)
```

#### 🔴 The NDA rule

The sheet's `NDA_formateur` column conflates two different things:

- **PANDO's own NDA** (`11950745495` — Île-de-France / Val-d'Oise, matching PANDO's siège at Soisy-sous-Montmorency). This belongs to the **organisation**, and appears on every convention PANDO issues.
- **An external subcontractor's NDA** (Sophie: `11931001093` · Anthony: `11770877977`). This belongs to the **formateur**, and appears on their convention de sous-traitance.

They are not the same field. Model them separately:

```
Organisation.nda   → PANDO's NDA          (on all conventions de formation)
Formateur.nda      → external formateurs only
```

An auditor will notice the difference.

#### 🔴 Data-corruption note — the `siren_formateur` collision

In the live sheet, Alexandra's `siren_formateur` reads `909625113`. That is the SIREN embedded in **OPTA'S's own SIRET** (`909625113 00016`). One number cannot be two companies' SIREN — it is the client's SIREN pasted into the formateur cell, the same class of error as Sophie's incrementing street number.

The app must make this class of error structurally impossible: a SIREN is a **String**, validated, and **owned by exactly one entity**.

#### `FormateurCompetence` 🔴 *new — Criterion 5*

`yearsFormation: Int` is not evidence. Criterion 5 requires demonstrated qualification and **ongoing** development.

| Field | Type | Notes |
|-------|------|-------|
| `formateurId` | FK | |
| `type` | Enum | `CV` / `DIPLOME` / `CERTIFICATION` / `FORMATION_CONTINUE` / `SUPERVISION` |
| `title` | String | |
| `date` | Date | |
| `documentId` | FK? → Document | |
| `expiresAt` | Date? | Certifications lapse — the app should warn |

> **WOW! specifically** requires a certified coach under regular supervision — PANDO's own product documentation calls this non-negotiable. Both must be evidenced here.

---

#### `Financeur` / `Financement` 🔴 *new — entirely absent today*

The funding route determines **which documents are mandatory**, **whether a subcontractor needs their own Qualiopi**, and **which BPF line the revenue lands on**. Without it, `bpfIncluded`, `prestationCode` and `specialite` are decorative and the BPF cannot be generated.

| Field | Type | Notes |
|-------|------|-------|
| `parcoursId` | FK | |
| `type` | Enum | `ENTREPRISE_DIRECTE` / `OPCO` / `CPF` / `FONDS_PROPRES` / `AUTRE` |
| `financeurId` | FK? → Financeur | The OPCO, where applicable |
| `dossierNumber` | String? | |
| `montantPrisEnCharge` | Int | euro cents |
| `status` | Enum | |

---

## 5. The document chain

### The order, and the two signature events

```
   Proposition pédagogique & commerciale
              │
              ▼
   ┌──────────────────────┐
   │  DEVIS  (Qonto)      │
   └──────────────────────┘
              │
              ▼
   ╔══════════════════════╗
   ║  SIGNATURE #1        ║   YouSign — client signatory
   ╚══════════════════════╝
              │
              ▼
   ┌──────────────────────┐
   │  Participant list    │   ⚠ Blocking. No list → no convention.
   │  received            │
   └──────────────────────┘
              │
              ▼
   ┌──────────────────────┐
   │  CONVENTION          │   Generated, filled with participant data
   │  DE FORMATION        │
   └──────────────────────┘
              │
              ▼
   ╔══════════════════════╗
   ║  SIGNATURE #2        ║   YouSign — client signatory
   ╚══════════════════════╝
              │
              ├──────────────────────► FACTURE (Qonto)
              │
              └──────────────────────► CONVENTION DE SOUS-TRAITANCE
                                        (YouSign — external formateur)
```

### 🔴 The alert nobody has modelled

The convention **cannot be generated until the participant list arrives**. Therefore the J-5 convention alert is too late to be actionable — by then it is already impossible to recover.

| Alert | Trigger | Why |
|-------|---------|-----|
| **J-12 — participant list not received** | 🔴 **New** | Without it there is no convention. Without a convention there is no signature by J-5. *This is the most likely real-world cause of a missed convention, and nothing currently watches for it.* |
| J-5 — convention not signed | Existing | |

### Document register

| Document | Generated from | Signature | Recipient |
|----------|---------------|-----------|-----------|
| Proposition pédagogique | Formation + AnalyseBesoin | — | Client |
| Devis | Parcours + pricing | ✅ YouSign | Client signataire |
| Convention de formation | **Contractualisation** + Participants + FormationVersion | ✅ YouSign | Payer's signataire |
| 🔴 **Contrat de formation professionnelle** | Contractualisation (payerType = INDIVIDU) | ✅ YouSign | The individual — **10-day rétractation** |
| 🔴 **Bon de commande** | Public client | — (received) | Public procurement — replaces the signed devis |
| Convention de sous-traitance | Parcours + Formateur | ✅ YouSign | Formateur (external) |
| Programme | **FormationVersion** (generated, not uploaded) | — | Client + Participants |
| Convocation | Sequence + Participant | — | Participant + Formateur |
| Feuille d'émargement | Sequence + Participants | Digital, both parties | See §7 |
| Évaluation des acquis | — | — | Participant |
| Attestation de fin de formation | Parcours + Participant | — | Participant + Client |
| **Certificat de réalisation** 🔴 | Parcours + Attendance hours | — | **Financeur** — *missing today; different document from the attestation* |
| Facture | **Contractualisation** | — | The payer — 🔴 **via Chorus Pro if `isPublicSector`.** See §4.6. |
| Supports de formation | Uploaded by formateur | — | Participants |

### 🔴 The document chain branches on `pandoRole`

| | **PRESTATAIRE_DIRECT** | **SOUS_TRAITANT** |
|---|---|---|
| PANDO signs with the client | Convention de formation | — |
| PANDO signs with the donneur d'ordre | — | **Convention de sous-traitance** (PANDO as *sous-traitant*) |
| PANDO issues to external formateur | Convention de sous-traitance | Convention de sous-traitance |
| Convocations, attestations | Issued by PANDO | ⚠️ **Open — see §15.** May be issued under the donneur d'ordre's letterhead. |
| Émargement, évaluations, acquis | PANDO produces | **PANDO produces** — PANDO delivers, so PANDO holds the pedagogical proof, and transmits it to the prime |
| Facture | To the client | To the **donneur d'ordre** |

**PANDO can be a *sous-traitant* on one parcours and a *donneur d'ordre* on the next — including within the same parcours** (subcontracting to OPTA'S while subcontracting delivery to Anthony). The two relationships are orthogonal and both must be representable.

### 🔴 `DocumentTemplate` — versioned

The reference doc says conventions are "generated." **From what wording?**

The convention de formation carries mandatory legal mentions (Code du travail). PANDO's invoices carry the VAT exonération mention (art. 261-4-4° a CGI). These change. Someone has to edit them. And a document must record **which template version produced it** — otherwise a template edit retroactively invalidates the provenance of every document ever generated.

| Field | Notes |
|-------|-------|
| `type` | Which document |
| `version` | Immutable once used |
| `body` | Template with merge fields |
| `legalMentions` | Text — the mandatory mentions, editable by SUPER_ADMIN |
| `effectiveFrom` | |
| `Document.templateVersionId` | 🔴 FK — every generated document records its template |

Only `SUPER_ADMIN` may edit templates.

### Edge case to resolve

**Participants added after signature #2.** Standard practice is an *annexe* to the convention; a material change requires an *avenant*. The model must support both. → See §15.

---

## 6. The automation engine

### The rule that governs everything

> **The app owns the scheduling. Brevo only delivers.**

Do **not** put J-7 / J-5 / +3-month logic inside Brevo automations. If you do:

- Qualiopi timing lives in a third party
- The proof is not queryable from your own database
- *"Duplicate a parcours and just change the dates"* becomes a Brevo problem instead of an app feature

The app computes what is due, calls Brevo to send, stores the message ID and the delivery webhook result. **Brevo is a pipe.**

These are **transactional** sends, not marketing — different consent basis, different deliverability path, different list handling. Keep them separate in Brevo.

### 🔴 Cloud Tasks cannot schedule 12 months ahead

The maximum schedule time for a Cloud Tasks task is **30 days** from the current date and time. Beyond that it errors. `ARCHITECTURE.md` §12 currently creates cold-evaluation jobs at session confirmation with `addMonths(endDate, 12)` — **these will fail at enqueue.**

**Correct pattern:**

1. Persist the due date on the record (`AutomationJob.scheduledFor`)
2. A **daily Cloud Scheduler sweeper** queries everything due in the next 24h
3. The sweeper enqueues Cloud Tasks jobs for that window only

This same pattern serves the communication parcours and every long-horizon trigger. Build it once.

### Trigger register

| Trigger | Anchor | Offset | Level | Recipient | Artefact |
|---------|--------|--------|-------|-----------|----------|
| `ANALYSE_BESOIN` | Demande created | — | Demande | Admin | Structured record (manual) |
| `DEVIS_SEND` | Proposition accepted | — | Parcours | Client | Qonto + YouSign |
| `DEVIS_ALERT_UNSIGNED` | Devis sent | +7d | Parcours | Admin | Alert |
| 🔴 `LISTE_PARTICIPANTS_ALERT` | Parcours start | **J-12** | Parcours | Admin | Alert |
| `CONVENTION_SEND` | Participant list complete | — | Parcours | Client | Generated + YouSign |
| `CONVENTION_ALERT_UNSIGNED` | Parcours start | J-5 | Parcours | Admin | Alert |
| `CONVENTION_ST_SEND` | Formateur assigned | — | Parcours | Formateur | Generated + YouSign |
| `FACTURE_SEND` | Convention signed | — | Parcours | Client | Qonto |
| `PROGRAMME_SEND` | Convention signed | — | Parcours | Client + Participants | Generated PDF |
| `CONVOCATION_SEND` | **Séquence** date | **J-7** | 🔴 **Séquence** | Participants + Formateur | Generated PDF |
| `POSITIONNEMENT_SEND` | Parcours start | J-7 | Parcours | Participants | Survey |
| `EMARGEMENT_READY` | Séquence date | J0 | 🔴 **Séquence** | Formateur | Digital sheet |
| `SATISFACTION_MI_SEND` | Parcours midpoint | — | Parcours | Participants | Survey (long parcours only) |
| `ACQUIS_SEND` | Last séquence | J0 | Parcours | Participants | Survey + QR |
| `EVAL_FORMATION_SEND` | Last séquence | J0 | Parcours | Participants | Survey |
| `ATTESTATION_SEND` | Acquis complete | — | Parcours | Participant + Client | Generated PDF |
| `CERTIFICAT_REALISATION` 🔴 | Parcours end | — | Parcours | Financeur | Generated from attendance hours |
| `SUPPORTS_SEND` | Parcours end | — | Parcours | Participants | Signed URLs |
| `QUESTIONNAIRE_COMMANDITAIRE` | Parcours end | — | Parcours | Client | Survey |
| `QUESTIONNAIRE_FORMATEUR` | Parcours end | — | Parcours | Formateur | Survey |
| `QUESTIONNAIRE_FINANCEUR` 🔴 | Parcours end | — | Parcours | Financeur | Survey (if distinct) |
| `EVAL_FROID_3M` / `_6M` / `_12M` | Parcours end | +3/6/12 months | Parcours | Participants | Survey — **configurable per parcours** |

**Note the `Level` column.** `CONVOCATION_SEND` and `EMARGEMENT_READY` fire **per séquence**. Everything else fires once per parcours. This is the Parcours/Séquence split expressed as behaviour.

### `AutomationTemplate` 🔴 *new*

The founder's actual request: *"je souhaite pouvoir dupliquer ces parcours types … je n'aurai qu'à changer les dates."*

A template is an ordered set of **(trigger, anchor, offset)** tuples. Instantiate the template against a parcours, set the séquence dates, and the entire chain schedules itself. This is the whole app in one object — and it currently has no model.

### 🔴 `CommunicationSequence` — the free-form module

**This was an explicit founder request and it is not the same thing as the Qualiopi triggers above.**

> *"Je veux pouvoir préparer et programmer des envois automatiques de communication diverses sur tout le temps de la formation : rappels d'ateliers, changement d'horaires ou de lieu, motivation et engagement, vidéo, documents divers… Je souhaite pouvoir dupliquer ces parcours types pour les diffuser à d'autres groupes similaires où je n'aurai qu'à changer les dates."*

The Qualiopi triggers are **fixed and non-negotiable** — they fire because the law and the référentiel require them.
The communication sequence is **arbitrary and editable** — it exists because PANDO's pedagogy lives *between* the séquences: the défis intersession, the motivational nudges, the capsule reminders. This is the *"apprentissage dans le flux du travail"* made operational.

Two engines, one scheduler.

| Entity | Purpose |
|---|---|
| `CommunicationTemplate` | A reusable, ordered set of messages. Each message: `(anchor, offset, audience, subject, body, attachments)` |
| `CommunicationSequence` | A template **instantiated** against a parcours. Dates resolve from the séquences. |
| `CommunicationMessage` | One scheduled or sent message. Editable until sent. |
| `CommunicationLog` | Delivery result from Brevo — message ID, delivered / bounced / opened |

**Anchors** are the same primitives as the automation engine: `PARCOURS_START`, `PARCOURS_END`, `SEQUENCE_N`, `FIXED_DATE`. Which is the point — *duplicate the template, set the séquence dates, and the whole nine-week BAM! communication plan schedules itself.*

Admins may edit or cancel any message **before** it sends. Sent messages are immutable.

---

## 7. Attendance and émargement

The hardest thing in the build. Also the thing that makes everything else work.

### Rules

**The unit is the demi-journée.** Not the day. A 7h day = matin + après-midi. This is the legal granularity and it is what produces certified hours.

**Both parties sign.** Participants *and* the formateur, per demi-journée. That is the legal shape of a feuille d'émargement.

**Four proof types, one table.** Presence is not the same thing across your parcours:

| Séquence type | Proof | Stored |
|---|---|---|
| Présentiel | Signature | Signature image + timestamp + IP |
| Distanciel / visio | Connection log | Join/leave timestamps |
| E-learning capsule | Completion trace | Completion event + score |
| Coaching (WOW!, flash) | Session record | Compte rendu + both-party confirmation |

**Offline is not optional.** Training rooms have bad wifi. Signatures queue locally (IndexedDB) and sync when the connection returns. This is a V1 requirement, not a nice-to-have.

**🔴 The paper fallback stays forever.** Generate the PDF → print → sign → scan → upload → mark `PAPER`. A dead router must never be able to block a session or destroy an audit trail. **Anyone who removes this fallback to keep the product "clean" is creating a Qualiopi incident.**

### `Attendance`

| Field | Type | Notes |
|-------|------|-------|
| `sequenceId` | FK | |
| `participantId` | FK | |
| `demiJournee` | Enum | `MATIN` / `APRES_MIDI` |
| `status` | Enum | `PRESENT` / `ABSENT_JUSTIFIE` / `ABSENT_NON_JUSTIFIE` / `ABANDON` |
| `preuveType` | Enum | `SIGNATURE` / `CONNEXION` / `COMPLETION` / `COMPTE_RENDU` / `PAPER` |
| `signatureData` | Text? | Base64 signature image |
| `signedAt` | DateTime? | |
| `signedIp` | String? | |
| `formateurSignedAt` | DateTime? | |
| `justification` | Text? | 🔴 An absence with no traced reason reads as sloppiness. With one, it reads as a managed event. |
| `documentId` | FK? | The scanned PDF, if `PAPER` |

> **OPCO caveat:** electronic émargement is broadly accepted, but individual OPCOs occasionally impose their own format. Verify with the OPCOs PANDO actually invoices. The PDF export covers both cases.

---

## 8. Evaluations

| Type | When | Recipient | Purpose |
|------|------|-----------|---------|
| `POSITIONNEMENT` | J-7 | Participant | Prerequisites, expectations, individualisation |
| `SATISFACTION_MI_PARCOURS` | Midpoint | Participant | Long parcours only |
| `ACQUIS` | Last séquence | Participant | 🔴 **Learning outcomes — not satisfaction.** The centre of the incoming référentiel. |
| `EVALUATION_FORMATION` | Last séquence | Participant | Satisfaction (formation + formateur) |
| `QUESTIONNAIRE_COMMANDITAIRE` | Parcours end | Client | |
| `QUESTIONNAIRE_FORMATEUR` | Parcours end | Formateur | |
| `QUESTIONNAIRE_FINANCEUR` | Parcours end | Financeur | If distinct |
| `FROID_3M` / `_6M` / `_12M` | +3/6/12 months | Participant | Transfer to the workplace |

### Two rules

**Separate `ACQUIS` from satisfaction.** They are different questions and the référentiel treats them differently. Most OF conflate them and fail on exactly this.

**🔴 Mirror the answers into your own database.** Do not store only a `typeformResponseId` (or Brevo/Tally equivalent). If that account lapses or the vendor changes, **your evidence of learning evaporates.** The third party is a collection mechanism; the answers are yours and must live in Postgres.

### The pedagogical artefacts that *are* the proof

PANDO's method already produces exactly what the new référentiel wants to see. These must be first-class records, not files in a Drive folder:

- **Test de positionnement** → upstream individualisation
- **Défis intersession** → transfer into the flow of work
- **Flash coaching** → individualised follow-up
- **Plan d'action 90 jours** → measurable effect on the learner
- **Carnet PANDO** → traceable learner journey
- **REX collectif** → collective consolidation

Most training organisations have none of this. PANDO has all of it, and currently no system that proves it. **This is the strongest audit asset in the business and it is invisible.**

---

## 9. The Qualiopi layer

### The référentiel is data, not code

Do **not** hardcode a document checklist into a React page. Model it:

```
Referentiel (versioned)
   └── Critere (7)
         └── Indicateur (32; 22 applicable to a pure OF)
               └── EvidenceLink ──→ any artefact
                                    (Document · Attendance · Evaluation ·
                                     AnalyseBesoin · FormateurCompetence ·
                                     Reclamation · ActionAmelioration · Veille)
```

Conformity is then **computed**, not asserted. When the référentiel changes, it is a data migration — not a rewrite.

This is not hypothetical. A projet de décret (NOR TRSD2609875D), circulated in early July 2026, would replace the indicator annex of the Code du travail with effect from **1 November 2026**, shifting the centre of gravity from documentary conformity to demonstrated pedagogical quality — with audits including formateur interviews, learner interviews and observation of training sequences. Nothing is published yet and nothing is enforceable. But the app is being built now, and this is a three-hour design decision that saves a month later.

> **⚠️ Verify the indicator set against the official *guide de lecture* before implementation.** The criteria are stable (see below); the indicators and their expected proofs are what move.

### The seven criteria

| # | Criterion | Primary evidence in this app |
|---|-----------|------------------------------|
| 1 | Information du public | `Formation` (structured, versioned): objectives, prerequisites, duration, délais d'accès, accessibilité, tarifs, published results |
| 2 | Objectifs et adaptation des prestations | `AnalyseBesoin`, `Positionnement`, `adaptationsProposees` |
| 3 | Adaptation aux publics · accueil · suivi · évaluation | `Attendance`, `ParcoursParticipant` state machine, accessibility chain, `Evaluation` (acquis) |
| 4 | Adéquation des moyens | `Sequence` (lieu, modalité), supports, `methodesPedagogiques` |
| 5 | Qualification des personnels | `FormateurCompetence` — CV, diplomas, CPD, supervision |
| 6 | Investissement dans l'environnement professionnel | `Veille` (légale, métier, pédagogique, handicap) |
| 7 | Appréciations et réclamations | `Evaluation` (satisfaction, à froid), `Reclamation`, `ActionAmelioration` |

### 🔴 Conformity ≠ document count

The current mockup reads **7 / 11 étapes · 64%** and scores four KPIs: *Conventions signées · Convocations J-7 · Évaluations acquis · Évals à froid.*

Those are four **documents**. There are **22 indicators**.

A parcours can hold every one of its eleven documents and still be non-conforme: no adaptation traced for a declared accessibility need; no response logged to a complaint; no CPD evidence for the formateur. **Scoring documents feels like conformity and is not.**

### Audit mode

**Conformity is computed per parcours, not globally.** Auditors *sample*. A single missing demi-journée of émargement on a sampled parcours is a non-conformity. The dashboard must surface the weak parcours **before the auditor picks them**.

**The auditor gets a scoped, read-only, time-boxed link** — not a PDF export. An auditor does not want a document; they want to *sample*. The tokenised-access machinery already exists for this. The PDF export remains available as a fallback.

---

## 10. Continuous improvement

Three models, entirely absent today, covering most of two criteria.

#### `Reclamation` 🔴

Binary: you either have a traced **intake → qualification → response → action** loop, or you do not.

| Field | Notes |
|-------|-------|
| `source` | Participant / client / formateur / financeur |
| `receivedAt`, `receivedVia` | |
| `description` | |
| `qualification` | Enum — severity / type |
| `responseAt`, `responseText` | The traced answer |
| `actionAmeliorationId` | FK? — what actually changed as a result |
| `closedAt` | |

#### `ActionAmelioration` 🔴

*"We take feedback into account"* is explicitly no longer sufficient. The expectation is **dated actions, with a named owner, and evidence of what actually changed.**

| Field | Notes |
|-------|-------|
| `origin` | Enum — `RECLAMATION` / `EVALUATION` / `AUDIT` / `VEILLE` / `INTERNE` |
| `description` | |
| `ownerId` | 🔴 FK → User — **a named person, not "the team"** |
| `dueDate` | 🔴 |
| `status` | |
| `outcome` | 🔴 **What concretely changed.** Not "actioned". |
| `verifiedAt`, `verifiedBy` | |

#### `Veille` 🔴 — Criterion 6

| Field | Notes |
|-------|-------|
| `type` | `LEGALE` / `METIER` / `PEDAGOGIQUE` / `HANDICAP` / `INNOVATION` |
| `source` | |
| `summary` | |
| `soWhat` | 🔴 **What changed at PANDO because of this.** A log of links is not veille. |
| `date`, `authorId` | |

Design target: **a two-minute log entry.** If it takes longer, it will not be done, and Criterion 6 fails on an empty table.

---

## 11. Financial and BPF

The **Bilan Pédagogique et Financier** is an annual legal filing. It is currently impossible to generate, because `Financeur` does not exist and hours are not tracked.

With `Financement` + `Attendance` (hours) + `Formation` (`prestationCode`, `specialite`, `bpfIncluded`), it becomes a computed export:

- 🔴 **`Parcours.pandoRole` determines the BPF revenue line.** Direct prestations are *produits provenant d'entreprises*; subcontracted delivery is *produits provenant d'organismes de formation*. Subcontracting **out** (to Sophie, Anthony) is a *charge* — *achats de prestations de formation*. The BPF distinguishes all three, and none of it is computable without `pandoRole` + `Financement`.
- Total hours delivered = Σ `Attendance` where `status = PRESENT`, by demi-journée × hours
- Trainee count, by category
- Revenue, by funding origin
- Breakdown by prestation code and speciality

**Requirements:**

- Money is stored in **euro cents as integers**. Never floats.
- VAT is explicit: `montantHT` / `tva` / `montantTTC`.
- Qonto invoice PDFs are **mirrored into PANDO's own bucket**, exactly as YouSign's signed documents already are. Do not let the proof of invoicing live only in a third party.

---

## 12. Integrations

| Service | Role | Non-negotiable rule |
|---------|------|---------------------|
| **Brevo** | Email delivery | The app owns scheduling. Brevo delivers, returns a message ID, and reports delivery via webhook. **No business logic inside Brevo.** Transactional stream, separate from marketing. |
| **YouSign** | E-signature | Devis, convention, convention de sous-traitance. Signed PDFs copied into PANDO storage on webhook. |
| **Qonto** | Devis + facture | Triple-lock idempotency (DB lock → deterministic key → named Cloud Task) as already specified in `ARCHITECTURE.md`. 🔴 **Mirror invoice PDFs into PANDO storage.** |
| **Survey tool** | Evaluation collection | 🔴 **Mirror all answers into Postgres.** The tool collects; PANDO owns. |
| 🔴 **INSEE SIRENE** | SIRET lookup | Name · address · NAF · **catégorie juridique** → sources `isPublicSector`. Free. Makes the float-SIRET corruption impossible. See §4.12. |
| 🔴 **Chorus Pro** | Public-sector invoicing | Mandatory since 2020 for the State, collectivités, établissements publics. Qonto does not do this. See §4.6. |

### 🔴 Puppeteer

Headless Chrome in the same container as the app means cold starts and OOMs at 512 Mi. **Split document generation into its own Cloud Run service** with its own memory profile.

### AI assistant

An LLM that drafts a relance email is fine. **An LLM anywhere near evidence generation is a liability** — auditors are explicitly trained to detect proof that reads as fabricated or written in a single uniform voice. Keep AI on the *nudge* side of the line. Never the *proof* side.

---

## 13. Deferred to V2

| Deferred | Consequence in V1 | Prepare now by… |
|----------|-------------------|-----------------|
| **Website ↔ app connection** | The public site is a separate build | Keeping `Formation` as **structured, versioned data** — so V2 is a read, not a migration |
| **Online INTER registration** | 🔴 The process doc specifies *"inscription en ligne via le site"*. With the site disconnected, inter inscriptions must either be **entered manually by an admin** or served by a **public registration page hosted by the app**. → **Decision required.** See §15. |
| **Participant portal** | Participants remain token-only | The token architecture already supports upgrading |
| **Formateur mobile app** | Formateurs use the responsive web app | Offline-first émargement is built in V1 regardless |

---

## 14. Acceptance criteria

The build is done when all three are true.

1. **Nobody opens Excel.** Ever. For anything.
2. **A formateur can run a complete BAM! without asking an admin a single question** — every convocation, every défi, every coaching slot, every émargement fires on its own.
3. **A Qualiopi audit takes an afternoon, not a month** — and any parcours the auditor picks at random is complete.

### Supporting checks

- Every one of the live data errors is **structurally impossible** to reproduce (SIRET as float, phone leading zeros, formateur address drift, client with two postcodes).
- Any parcours from the live data — including **OPTA'S: 6 séquences, June 2026 → March 2027** — can be created, run and proved in the app.
- Every artefact in the system links to at least one indicator, and every applicable indicator has at least one evidence source.

---

## 15. Open questions

| # | Question | Blocks | Owner |
|---|----------|--------|-------|
| 1 | **Inter registration in V1** — manual admin entry, or a public registration page hosted by the app? (The site is disconnected in V1, but the process doc assumes *"inscription en ligne via le site."*) | Inter track, payment flow | Alexandra |
| 2 | **Participants added after signature #2** — annexe, avenant, or both? What triggers which? | Document chain | Alexandra |
| 3 | **COMMERCIAL role scope** — does Yann need the Qualiopi/document layer, or is he scoped to pre-contract (clients, demandes, devis) only? | §3 permissions | Alexandra |
| 4 | **Sous-traitance — who issues what?** When PANDO is *sous-traitant*, are convocations and attestations issued by PANDO or by the donneur d'ordre? | §5 | Certifier |
| 5 | **Sous-traitance — Qualiopi scope.** Are prestations PANDO delivers *as a subcontractor* in scope for PANDO's own audit sampling? | §9 | **Certifier** |
| 6 | **Input VAT deductibility.** Confirm PANDO cannot deduct the 20 % billed by VAT-registered formateurs — i.e. that it is an absorbed cost. | §4.3 margin | **Accountant** |
| 7 | **OPCO émargement formats** — do the OPCOs PANDO invoices accept electronic émargement? | §7 | Alexandra |
| 8 | **Cold evaluation cadence** — 3/6/12 configurable per parcours, or fixed policy? | §6 | Alexandra |
| 9 | **Next audit date** — determines whether V1 targets the current référentiel or the post-1-November-2026 version, and whether a bridge is needed. | §9, roadmap | **Alexandra — most consequential open item** |
| 10 | **Who builds it** — in-house, agency, freelance, AI-assisted? Changes how prescriptive the schema and slice documents must be. | Roadmap | Alexandra |
| 11 | 🔴 **Invoicing fork** — Qonto alone (+ Chorus Pro bolted on), or a **Plateforme Agréée** from day one? Reception capability is mandatory from **1 Sept 2026**. | §4.6, integrations | **Accountant — this week** |
| 12 | 🔴 **Rétractation mechanics** — exact deposit cap and window for a self-paying individual. The process doc's *"paiement 48h avant"* may be unlawful in that case. | §4.5 | **Accountant** |
| 13 | **Chorus Pro scope** — CAF (organisme de sécurité sociale) is not obviously a *collectivité*. Is it in Chorus Pro scope? | §4.6 | Accountant |
| 14 | 🔴 **Is WOW! coaching a BPF *action de formation*?** If it is an *accompagnement* rather than a formation, it is out of the BPF and possibly out of OPCO eligibility. `Formation.bpfIncluded` is the switch. | §4.12, §11 | **Accountant** |
| 15 | **NAF → secteur mapping** — supply the referenced file, or derive `secteur` from NAF sections? | §4.12 | Alexandra |
| — | **Four pedagogical questions** (Carnet, plan 90j, défis, WOW! confidentiality) | — | → **§18** |

### Resolved

| Question | Answer |
|---|---|
| Devis *valant* convention? | ❌ No. PANDO sends **both**: devis signed first, then convention. |
| Alexandra's status | Owner of PANDO, acting **under** PANDO → `INTERNE_DIRIGEANT`. No ST convention. `2026-ST100` is a phantom. |
| `11950745495` | **PANDO's NDA**, not personal. |
| `siren_formateur = 909625113` on the OPTA'S row | Data corruption — the client's SIREN pasted into the formateur cell. |
| VAT | PANDO does not bill VAT (exonération, art. 261-4-4° a CGI). Formateurs may. |
| Yann | `COMMERCIAL`. Sales, not delivery. |
| Can PANDO be a subcontractor? | ✅ Yes — via the *appel d'offre* model. Hence `pandoRole`. |

---

## 16. Exception paths

> **The happy path never needed a system.** Everything above describes a formation that goes right. This chapter describes what happens when it doesn't — and it is where the founder's trust in the app is won or lost.

### 16.1 Parcours cancelled

| Concern | Rule |
|---|---|
| Scheduled automations | **All pending jobs cancelled.** Sent messages are immutable and remain in the log. |
| Signed convention | Retained. Marked `ANNULE`. **Never deleted** — a signed document is a legal fact. |
| Issued invoice | Requires an **avoir** (credit note) via Qonto. Not a deletion. |
| Financement / OPCO dossier | Flagged for manual withdrawal. The app cannot do this. |
| Participants | `ParcoursParticipant.status = ANNULE`. Inter payers → refund flag. |
| Qualiopi | A cancelled parcours **stays in the evidence base**, with its reason. Cancellations are normal; *unexplained* cancellations are not. |

`cancellationReason` is **required**. No silent cancellation.

### 16.2 Séquence rescheduled

The most common real event in a nine-week parcours, and the one with the widest blast radius.

```
Séquence date changes
   → all pending automations anchored to that séquence RECOMPUTE
       (convocation J-7, émargement J0)
   → downstream séquences do NOT move automatically
   → Parcours.dateDebut / dateFin recompute (derived)
   → if the new date is < J-7 away:
        ⚠️ convocation is now IMPOSSIBLE to send on time
        → raise a BLOCKING alert, require explicit admin acknowledgement
   → participants + formateur notified (CommunicationSequence)
   → an audit-log entry records the change, the old date, and who made it
```

🔴 **The J-7 convocation is a Qualiopi expectation.** A late reschedule that makes it impossible must be *visible and acknowledged*, not silently absorbed.

### 16.3 Email bounced or undelivered

**A convocation that bounced was not sent.** For Qualiopi, proof of *dispatch* is not proof of *delivery*.

Brevo returns delivery webhooks. The reference doc says to store them; this says what to *do* with them:

| Brevo event | System behaviour |
|---|---|
| `delivered` | ✅ Green. This is the proof. |
| `soft_bounce` | Auto-retry ×2 over 24h. Then escalate. |
| `hard_bounce` | 🔴 **Alert immediately.** The address is dead. The artefact is **not** proved. Mark the step `FAILED`, never `DONE`. |
| `blocked` / `spam` | 🔴 Alert. Same treatment. |
| No event within 24h | 🟠 Amber. Unconfirmed. |

🔴 **A step whose email hard-bounced must never render as a green tick.** This is the single most dangerous silent failure in the entire system: an audit trail that *looks* complete and isn't.

### 16.4 Signature never completed

| Stage | Rule |
|---|---|
| Devis unsigned | Alert +7d. Auto-relance ×2. Then a task for the commercial. |
| Convention unsigned | Alert **J-5**. **Blocking at J-1**: a parcours cannot move to `EN_COURS` without a signed convention — it can only be *force-started* by a SUPER_ADMIN, with a reason, logged. |
| YouSign request expired | Auto-regenerate and resend. Max 3 attempts, then escalate. |
| ST convention unsigned | The formateur cannot open the émargement view. Hard gate. |

The force-start escape hatch exists because reality demands it — and it is **logged, attributed and surfaced in the audit view** precisely because it is a deviation.

### 16.5 Participant list not received

🔴 **Already flagged in §5, restated here because it is the highest-frequency failure mode.**

No list → no convention → no signature → no compliant parcours.

```
J-12 → alert: participant list not received
J-7  → escalate
J-5  → convention alert fires, and it is already too late to recover
```

### 16.6 Participant no-show, absence, abandon

| Case | Handling |
|---|---|
| Absent for one demi-journée | `Attendance.status = ABSENT_JUSTIFIE / ABSENT_NON_JUSTIFIE` + **`justification` required** |
| Abandons mid-parcours | `ParcoursParticipant.status = ABANDON` + **`abandonReason` required** + a traced PANDO response |
| Never attends | `ABSENT`. No attestation. Hours = 0. Invoice may require adjustment → flag. |
| Joins at séquence 4 of 10 | Allowed. Hours computed from actual attendance. **Attestation reflects real hours, never contracted hours.** |

🔴 **An attendance gap with no reason reads as sloppiness. With a reason and a traced response, it reads as a managed event.** That distinction is the whole of Criterion 3 in one sentence.

### 16.7 Participants added after signature

| Case | Document |
|---|---|
| Added before the parcours starts, no material change | **Annexe** to the convention |
| Changes price, duration or scope | **Avenant** — requires a new signature |
| Added mid-parcours | Avenant + hours computed from their actual start |

→ See §15 Q2 — the trigger threshold needs Alexandra's call.

### 16.8 INTER under-subscription

BAM! inter shows *"4/10 inscrits"*. What happens?

```
J-14 → if enrolled < minParticipants:
          ⚠️ alert — decision required
J-7  → decision deadline (configurable per formation)
          → RUN     : proceed below minimum, margin flagged
          → CANCEL  : §16.1 + refunds + a proposed transfer to the next session
```

Never let this decision be made by silence.

### 16.9 Formateur unavailable

| Case | Handling |
|---|---|
| Cancels before the parcours | Reassign. The ST convention is **regenerated** for the new formateur; the old one is voided, not deleted. |
| Cancels mid-parcours | Reassign **per séquence** — which the Séquence-level `formateurId` already permits. |
| Qualification lapses (`FormateurCompetence.expiresAt`) | 🔴 Alert **before** the expiry date. A formateur with a lapsed certification delivering a parcours is a Criterion 5 non-conformity. |

### 16.10 The integration is down

| Failure | Behaviour |
|---|---|
| Brevo down | Queue. Retry with backoff. **Never mark a send as done that wasn't.** |
| YouSign down | Queue. The document exists; only the signature request is pending. |
| Qonto down | Triple-lock idempotency (see `ARCHITECTURE.md` §10) means the retry is safe. **Never double-invoice.** |
| Survey tool down | Answers already mirrored into Postgres are unaffected. See §8. |
| **Émargement — no network in the room** | Offline queue (IndexedDB) → sync on reconnect → **paper fallback always available.** See §7. |

🔴 **Universal rule: no integration failure may ever produce a false-positive in the audit trail.** A failed step is `FAILED` or `PENDING`. It is never `DONE`.

---

## 17. Data migration

Two years of clients, formateurs, participants and parcours currently live in a spreadsheet with corrupted SIRETs, phone numbers, addresses and postcodes. **Getting them in cleanly is a prerequisite for the first audit**, and it is real work.

### The known corruption

| Defect | Live example | Fix |
|---|---|---|
| SIRET as float | `50837292700014.0` | Cast to String, validate 14 chars + Luhn |
| Phone as float | `646633164.0` → lost leading `0` | Cast to String, normalise to E.164 |
| NDA as float | `11931001093.0` | Cast to String |
| Postcode as float | `75019.0` | Cast to String, pad to 5 |
| Address drift (Excel autofill) | Sophie: `28 → 34 rue Joliot Curie` | **Manual verification. Cannot be automated.** |
| Same client, two postcodes | Le 104: `75019` / `75020` | Deduplicate on SIRET; manual reconciliation |
| SIREN cross-contamination | Alexandra's cell holds OPTA'S's SIREN | Manual verification |
| Convention with no dates, no participants | `2026-F102` | Manual reconciliation |
| Phantom ST convention | `2026-ST100` (Alexandra, internal) | Void — see §4.11 |

### Approach

1. **Freeze the sheet.** A cut-off date, after which all new parcours are created in the app.
2. **Import in dependency order:** Formations → Clients + Contacts → Formateurs → Participants → Parcours → Séquences → Documents.
3. **Validate on import, do not repair silently.** Every SIRET, SIREN, NDA, postcode and phone is checked. Failures go to a **rejection report**, not to a default value.
4. 🔴 **Every address, SIREN and NDA is manually verified against source.** The corruption is not detectable by validation — `29 rue Joliot Curie` is a perfectly valid address. It is simply not hers.
5. **Historical documents are re-linked, not regenerated.** A convention signed in 2026 keeps its original PDF. Never re-issue a signed document.
6. **Backfill evidence links** so historical parcours appear in the Qualiopi view.

> 🔴 **Do not migrate the corruption.** A clean 200-row import beats a dirty 2 000-row one — the whole point of the app is that the data is finally trustworthy.

---

---

## 18. Pending — Alexandra

Four questions the domain cannot close without her. **They do not block the schema** — each is modelled below as a nullable extension point, so her answers require configuration, not migration.

| # | Question | Extension point in the schema | If she says… |
|---|---|---|---|
| 1 | **Carnet PANDO** — paper booklet, private PDF, or digital in-app? *(BAM! = "carnet du manager lucide"; POP! = "Carnet POP! Manager stratégique"; WOW! = "Cahier de coaching")* | `ParcoursParticipant.carnetIssuedAt` **+** a `CarnetEntry` table, unused until activated | **Paper** → one timestamp. **Digital** → 🔴 *the single richest evidence object PANDO has*: participant-authored, timestamped, accreting week by week — the one artefact an auditor cannot suspect of being written after the fact. |
| 2 | **Plan d'action 90 jours** — structured (3 engagements, revisited at +90d, feeding the évaluation à froid), or a PDF the participant keeps? | `PlanAction` + `PlanActionEngagement` (nullable) | **Structured** → it becomes the bridge from the parcours to the évaluation à froid — i.e. the actual proof of transfer into the workplace. |
| 3 | **Défis intersession** — tracked per participant (submitted / feedback), or purely in-room? | `Sequence.type = DEFI` **+** `DefiSubmission` (nullable) | **Tracked** → *apprentissage dans le flux du travail*, evidenced. |
| 4 | **WOW! confidentiality level** — can an ADMIN read a coaching compte rendu, or only the coach and the beneficiary? | `confidentiality` enum (§4.7) — the value, not the mechanism | The mechanism ships either way. Only the default changes. |

> **Design rule for all four:** model the table, ship it empty. Activating a nullable relation is a config change. Adding a relation to a live schema is a migration.

---

*End of document. This is the domain source of truth. When it conflicts with `ARCHITECTURE.md`, this document wins — and `ARCHITECTURE.md` gets updated.*
