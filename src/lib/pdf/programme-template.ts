import type { FormationSnapshot } from '@/lib/formation'
import { FORMAT_LABELS, BRAND_PROGRAMME_LABELS } from '@/lib/catalogue-labels'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Pure: snapshot → HTML string. No Puppeteer import here — this file is the
 * boundary that stays put if PDF rendering is later lifted into its own
 * Cloud Run service (see src/lib/pdf/pdf-engine.ts).
 *
 * 🔴 Reads ONLY from the frozen FormationVersion.snapshot, never a live
 * Formation row — the programme is generated, never uploaded (AGENTS.md §4).
 */
export function renderProgrammeHtml(
  snapshot: FormationSnapshot,
  meta: { version: number; generatedAt: Date },
): string {
  const objectives = snapshot.pedagogicObjectives
    .map((o) => `<li>${escapeHtml(o)}</li>`)
    .join('')

  const brand = snapshot.brandProgramme
    ? `<span class="badge">${escapeHtml(BRAND_PROGRAMME_LABELS[snapshot.brandProgramme] ?? snapshot.brandProgramme)}</span>`
    : ''

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(snapshot.title)}</title>
<style>
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #131519;
    font-size: 11pt;
    line-height: 1.5;
  }
  h1 { font-family: Georgia, serif; font-size: 22pt; font-weight: 500; margin: 0 0 4pt; }
  .subtitle { color: #4d5466; font-size: 12pt; margin: 0 0 12pt; }
  .badge {
    display: inline-block; background: #eff6ff; color: #2563eb;
    border-radius: 999px; padding: 2pt 10pt; font-size: 9pt; font-weight: 600;
    margin-bottom: 12pt;
  }
  h2 {
    font-size: 12pt; text-transform: uppercase; letter-spacing: 0.04em;
    color: #4d5466; margin: 20pt 0 6pt; border-bottom: 1px solid #dfe3ea; padding-bottom: 4pt;
  }
  p { margin: 0 0 8pt; }
  ol { margin: 0; padding-left: 18pt; }
  li { margin-bottom: 4pt; }
  .meta { display: flex; gap: 24pt; margin-bottom: 4pt; }
  .meta div { font-size: 10pt; color: #4d5466; }
  .meta strong { display: block; color: #131519; font-size: 11pt; }
  footer { margin-top: 32pt; padding-top: 8pt; border-top: 1px solid #dfe3ea; font-size: 8pt; color: #9aa3b5; }
</style>
</head>
<body>
  ${brand}
  <h1>${escapeHtml(snapshot.title)}</h1>
  ${snapshot.subtitle ? `<p class="subtitle">${escapeHtml(snapshot.subtitle)}</p>` : ''}

  <div class="meta">
    <div><strong>${escapeHtml(snapshot.durationHours)}h</strong>durée</div>
    <div><strong>${escapeHtml(snapshot.durationDays)}j</strong>jours</div>
    <div><strong>${escapeHtml(FORMAT_LABELS[snapshot.format] ?? snapshot.format)}</strong>format</div>
  </div>

  <h2>Public visé</h2>
  <p>${escapeHtml(snapshot.targetAudience)}</p>

  <h2>Prérequis</h2>
  <p>${escapeHtml(snapshot.prerequisites)}</p>

  <h2>Objectifs pédagogiques</h2>
  <ol>${objectives}</ol>

  ${
    snapshot.methodesPedagogiques
      ? `<h2>Méthodes pédagogiques</h2><p>${escapeHtml(snapshot.methodesPedagogiques)}</p>`
      : ''
  }

  ${
    snapshot.modalitesEvaluation
      ? `<h2>Modalités d'évaluation</h2><p>${escapeHtml(snapshot.modalitesEvaluation)}</p>`
      : ''
  }

  <h2>Délai d'accès</h2>
  <p>${escapeHtml(snapshot.delaiAcces)}</p>

  <h2>Accessibilité</h2>
  <p>${escapeHtml(snapshot.accessibilite)}</p>

  <footer>
    ${escapeHtml(snapshot.internalCode)} — version ${meta.version} — généré le
    ${meta.generatedAt.toLocaleDateString('fr-FR')} à ${meta.generatedAt.toLocaleTimeString('fr-FR')}
  </footer>
</body>
</html>`
}
