function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type DocumentRenderInput = {
  documentTitle: string
  reference: string
  issuer: { name: string; siret: string; nda?: string; address: string | null }
  recipientLines: string[]
  metaLines?: { label: string; value: string }[]
  table?: { headers: string[]; rows: string[][] }
  bodyParagraphs?: { heading?: string; text: string }[]
  /** 🔴 Legal mentions are quoted verbatim from the reference doc where known,
   * otherwise EXPLICITLY marked pending legal review — never invented. */
  legalMentions: string[]
  showSignatureBlock: boolean
  generatedAt: Date
}

/**
 * Pure: render input → HTML string. No Puppeteer import — same boundary as
 * programme-template.ts. One shared layout for every commercial/legal
 * document type (devis, convention, contrat, facture, attestation,
 * certificat, convocation) so eight document types don't need eight templates.
 */
export function renderDocumentHtml(input: DocumentRenderInput): string {
  const meta = (input.metaLines ?? [])
    .map((m) => `<div><strong>${escapeHtml(m.value)}</strong>${escapeHtml(m.label)}</div>`)
    .join('')

  const table = input.table
    ? `<table>
        <thead><tr>${input.table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${input.table.rows
          .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody>
      </table>`
    : ''

  const body = (input.bodyParagraphs ?? [])
    .map((p) => `${p.heading ? `<h2>${escapeHtml(p.heading)}</h2>` : ''}<p>${escapeHtml(p.text)}</p>`)
    .join('')

  const legal = input.legalMentions.length
    ? `<div class="legal"><h2>Mentions légales</h2>${input.legalMentions
        .map((m) => `<p>${escapeHtml(m)}</p>`)
        .join('')}</div>`
    : ''

  const signature = input.showSignatureBlock
    ? `<div class="signature">
        <div><p>Pour ${escapeHtml(input.issuer.name)}</p><div class="sig-box"></div></div>
        <div><p>Pour le destinataire</p><div class="sig-box"></div></div>
      </div>`
    : ''

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.documentTitle)}</title>
<style>
  @page { margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif; color: #131519; font-size: 10.5pt; line-height: 1.5; }
  h1 { font-family: Georgia, serif; font-size: 18pt; font-weight: 500; margin: 0 0 4pt; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.04em; color: #4d5466; margin: 16pt 0 6pt; border-bottom: 1px solid #dfe3ea; padding-bottom: 4pt; }
  p { margin: 0 0 8pt; }
  .issuer { font-size: 9pt; color: #4d5466; margin-bottom: 16pt; }
  .recipient { text-align: right; margin: -40pt 0 16pt; font-size: 10pt; }
  .ref { font-size: 9pt; color: #4d5466; margin-bottom: 20pt; }
  .meta { display: flex; gap: 24pt; margin-bottom: 12pt; }
  .meta div { font-size: 9.5pt; color: #4d5466; }
  .meta strong { display: block; color: #131519; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 16pt; }
  th, td { text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #dfe3ea; font-size: 10pt; }
  th { color: #4d5466; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.03em; }
  .legal { margin-top: 20pt; font-size: 8.5pt; color: #4d5466; }
  .legal p { margin: 0 0 4pt; }
  .signature { display: flex; justify-content: space-between; margin-top: 32pt; gap: 24pt; }
  .signature > div { flex: 1; }
  .sig-box { border: 1px dashed #c3c9d6; height: 60pt; margin-top: 8pt; }
  footer { margin-top: 32pt; padding-top: 8pt; border-top: 1px solid #dfe3ea; font-size: 8pt; color: #9aa3b5; }
</style>
</head>
<body>
  <div class="issuer">
    <strong>${escapeHtml(input.issuer.name)}</strong> — SIRET ${escapeHtml(input.issuer.siret)}
    ${input.issuer.nda ? ` — NDA ${escapeHtml(input.issuer.nda)}` : ''}
    ${input.issuer.address ? `<br/>${escapeHtml(input.issuer.address)}` : ''}
  </div>

  <div class="recipient">
    ${input.recipientLines.map((l) => `${escapeHtml(l)}<br/>`).join('')}
  </div>

  <h1>${escapeHtml(input.documentTitle)}</h1>
  <div class="ref">Référence ${escapeHtml(input.reference)}</div>

  ${meta ? `<div class="meta">${meta}</div>` : ''}
  ${body}
  ${table}
  ${legal}
  ${signature}

  <footer>
    Document généré le ${input.generatedAt.toLocaleDateString('fr-FR')} à ${input.generatedAt.toLocaleTimeString('fr-FR')}
  </footer>
</body>
</html>`
}
