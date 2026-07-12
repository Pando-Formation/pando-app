# PANDO

The operational system for PANDO — a Qualiopi-certified French management-training company.

It runs a formation from the first devis to the twelve-month follow-up, generates every legal document, tracks where every participant sits in the chain, and **leaves a complete Qualiopi trail as a by-product of doing the work.**

---

## Getting started

### 1 · Postgres

```bash
docker run --name pando-db \
  -e POSTGRES_PASSWORD=pando \
  -e POSTGRES_DB=pando \
  -p 5432:5432 -d postgres:16
```

*(No Docker? A free Neon or Supabase database works — just paste its URL.)*

### 2 · Environment

```bash
cp .env.example .env
openssl rand -base64 32          # → AUTH_SECRET
```

Google OAuth credentials are only needed to actually sign in. The database steps below work without them.

### 3 · Install and migrate

```bash
npm install
npx prisma migrate dev --name init          # generates 0001_init from schema.prisma
npx prisma migrate deploy                   # applies 0002_check_constraints
npm run db:seed                             # NSF (511 rows) · 7 critères · PANDO
```

### 4 · The gate

```bash
npm run db:fixture
```

**Expected: `8/8 corruption paths closed.`**

If it is not green, **stop**. Nothing else starts. This is the acceptance criterion for Slice 0 and it is not negotiable.

### 5 · Run

```bash
npm run dev
```

---

## What's in here

| | |
|---|---|
| `AGENTS.md` | 🔴 **Codex reads this first, every time.** The non-negotiables. |
| `docs/PANDO_APP_REFERENCE.md` | 🥇 **The domain. Wins every conflict.** |
| `docs/V1_SLICES.md` | The build order. One slice at a time. |
| `docs/PANDO_design_system.html` | The visual language. Roboto — not Inter. |
| `prisma/schema.prisma` | 49 models · 43 enums. **Final. Do not modify without updating the reference doc first.** |
| `prisma/migrations/0002_check_constraints/` | The raw-SQL constraints. **Not optional.** |
| `prisma/fixtures/real-data.ts` | The honest referee. |
| `prisma/seed/` | NSF taxonomy — 511 real rows. |

---

## Why the fixture matters more than the tests

PANDO currently runs on a 48-column spreadsheet. It is already failing:

- A formateur's street number was incremented by an Excel autofill drag — **wrong on 6 of 7 rows**, and that address prints onto a convention de sous-traitance.
- SIRETs are stored as floats (`5.0837292700014E13`).
- Phone numbers have lost their leading zeros.
- The same client appears with two different postcodes.
- An internal formateur carries a **convention de sous-traitance that describes a legal relationship which does not exist**.

None of that is carelessness. It is what happens when nothing stops it.

`prisma/fixtures/real-data.ts` takes each of those defects and tries to write it. **Every one must be rejected by the database.** That is the difference between an app that documents good intentions and one that enforces them.

---

## The one rule

> **A step whose email hard-bounced is `FAILED`. It is NEVER `DONE`.**

For Qualiopi, proof of *dispatch* is not proof of *delivery*. A convocation that bounced **was not sent**.

Marking a step complete because the API call succeeded produces an audit trail that **looks complete and is not**. It is the obvious implementation, and it is wrong.

---

## Verify before every PR

```bash
npm run verify      # prisma validate + tsc --noEmit + the corruption fixture
```

---

## Open questions

Live in **§15 and §18** of `docs/PANDO_APP_REFERENCE.md`.

If a task depends on one of them: **stop and ask.** Never invent legal mentions, retention periods, Qualiopi indicator numbers, VAT rules, rétractation periods or BPF categories. Plausible invention is worse than a question — it produces code that looks right and documents that are wrong.
