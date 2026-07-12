/**
 * MONEY IS ALWAYS AN INTEGER, IN EURO CENTS. NEVER A FLOAT.
 * Floats do not add up. There is no exception to this.
 */
export const euros = (cents: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100)

export const toCents = (euros: number): number => Math.round(euros * 100)

/** Compact chart-label form — no cents, k/M abbreviated. Never used for a ledger value, only a direct chart label. */
export const compactEuros = (cents: number): string => {
  const value = cents / 100
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`
  return `${Math.round(value).toLocaleString('fr-FR')} €`
}

/** Cents → plain decimal string for a form input's defaultValue (e.g. "150.5"). */
export const centsToEuroInput = (cents: number | null): string =>
  cents === null ? '' : (cents / 100).toString()

/**
 * 🔴 THE TRUE COST OF A FORMATEUR DAY.
 *
 * PANDO makes VAT-exonerated supplies (art. 261-4-4° a CGI) and therefore very
 * likely CANNOT DEDUCT the input VAT it pays. So a VAT-registered formateur's
 * 20% is an ABSORBED COST, not a pass-through.
 *
 *   Sophie    (0% VAT)   700€ + 20€ travel  =  720€/day
 *   Anthony   (20% VAT)  840€ + 20€ travel  =  860€/day   ← not 720€
 *   Alexandra (internal)                    =    0€/day   ← notional transfer,
 *                                                            no cash out
 *
 * Compute margin on HT and you overstate it on every VAT-registered formateur.
 * Count an internal formateur's day rate as a cost and you understate it on
 * every parcours Alexandra delivers.
 *
 * ⚠️ The non-deductibility assumption is pending confirmation from PANDO's
 *    accountant (reference doc §15 Q6). The shape of this function does not
 *    change either way — only the boolean.
 */
export function formateurDayCost(f: {
  contractType: 'INTERNE_DIRIGEANT' | 'INTERNE_SALARIE' | 'EXTERNE_PRESTATAIRE'
  tarifJour: number | null
  tvaRate: number
  forfaitDeplacement: number
}): number {
  if (f.contractType !== 'EXTERNE_PRESTATAIRE') return 0
  const base = f.tarifJour ?? 0
  return Math.round(base * (1 + f.tvaRate)) + f.forfaitDeplacement
}
