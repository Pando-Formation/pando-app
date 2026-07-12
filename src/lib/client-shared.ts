/**
 * Pure logic shared between server (src/lib/client.ts) and client components
 * (ClientForm) — no db/server imports, safe to bundle into the browser.
 *
 * 🔴 Catégorie juridique 7xxx = personne morale de droit public (INSEE
 * nomenclature). Mairie de Bordeaux = 7210 (commune). Gates a LEGAL
 * invoicing obligation: public clients MUST be invoiced through Chorus Pro.
 */
export function deriveIsPublicSectorClient(categorieJuridique: string | null | undefined): boolean {
  return Boolean(categorieJuridique && categorieJuridique.startsWith('7'))
}
