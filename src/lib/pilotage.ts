import { db } from '@/lib/db'
import { formateurDayCost } from '@/lib/money'
import { competenceStatus } from '@/lib/formateur'
import { findOverdueActions } from '@/lib/amelioration'

export type Alert = {
  severity: 'danger' | 'warning'
  category: string
  message: string
  href: string
}

const ACTIVE_PARCOURS_STATUSES = ['CONFIRME', 'EN_COURS'] as const

/**
 * 🔴 THE RISK RADAR. Every alert here is one click from the thing that
 * needs doing (href points straight at the record). Ordered danger-first —
 * a hard bounce or an overdue action is not the same urgency as an
 * unconfirmed convention two months out.
 */
export async function getAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []

  const unsignedConventions = await db.contractualisation.findMany({
    where: {
      status: { notIn: ['CONVENTION_SIGNEE', 'FACTUREE', 'PAYEE', 'ANNULEE'] },
      parcours: { status: { in: [...ACTIVE_PARCOURS_STATUSES] } },
    },
    include: { parcours: { select: { id: true, reference: true } }, payerClient: { select: { companyName: true } } },
  })
  for (const c of unsignedConventions) {
    alerts.push({
      severity: 'warning',
      category: 'Convention non signée',
      message: `${c.parcours.reference} — ${c.payerClient?.companyName ?? 'payeur'} n'a pas encore signé`,
      href: `/parcours/${c.parcours.id}`,
    })
  }

  const missingParticipants = await db.parcours.findMany({
    where: { status: { in: [...ACTIVE_PARCOURS_STATUSES] }, participants: { none: {} } },
    select: { id: true, reference: true },
  })
  for (const p of missingParticipants) {
    alerts.push({
      severity: 'danger',
      category: 'Liste de participants manquante',
      message: `${p.reference} — confirmé sans aucun participant inscrit`,
      href: `/parcours/${p.id}`,
    })
  }

  const hardBounces = await db.communicationMessage.findMany({
    where: { deliveryStatus: 'HARD_BOUNCE' },
    include: { sequence: { select: { parcours: { select: { id: true, reference: true } } } } },
  })
  for (const m of hardBounces) {
    const parcours = m.sequence?.parcours
    if (!parcours) continue
    alerts.push({
      severity: 'danger',
      category: 'Échec de livraison',
      message: `${parcours.reference} — ${m.recipientEmail} : ${m.subject}`,
      href: `/parcours/${parcours.id}`,
    })
  }

  const missingPositionnements = await db.parcoursParticipant.findMany({
    where: {
      positionnementStatus: 'PENDING',
      parcours: { status: { in: [...ACTIVE_PARCOURS_STATUSES] } },
    },
    include: { parcours: { select: { id: true, reference: true } }, participant: { select: { firstName: true, lastName: true } } },
  })
  for (const pp of missingPositionnements) {
    alerts.push({
      severity: 'warning',
      category: 'Positionnement manquant',
      message: `${pp.parcours.reference} — ${pp.participant.firstName} ${pp.participant.lastName}`,
      href: `/parcours/${pp.parcours.id}/participants/${pp.id}/modifier`,
    })
  }

  const overdueActions = await findOverdueActions()
  for (const a of overdueActions) {
    alerts.push({
      severity: 'danger',
      category: 'Action en retard',
      message: `${a.description} — ${a.owner.name ?? a.owner.email}`,
      href: '/amelioration',
    })
  }

  const competences = await db.formateurCompetence.findMany({
    where: { expiresAt: { not: null }, formateur: { deletedAt: null } },
    include: { formateur: { select: { id: true, firstName: true, lastName: true } } },
  })
  for (const c of competences) {
    const status = competenceStatus(c.expiresAt)
    if (status === 'expired' || status === 'expiring_soon') {
      alerts.push({
        severity: status === 'expired' ? 'danger' : 'warning',
        category: status === 'expired' ? 'Certification expirée' : 'Certification bientôt expirée',
        message: `${c.formateur.firstName} ${c.formateur.lastName} — ${c.title}`,
        href: `/formateurs/${c.formateur.id}`,
      })
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1))
}

export type AlertGroup = { category: string; severity: 'danger' | 'warning'; alerts: Alert[] }

/** One card per category — severity shown once (the worst present in the group), not repeated per row. */
export function groupAlertsByCategory(alerts: Alert[]): AlertGroup[] {
  const byCategory = new Map<string, AlertGroup>()
  for (const alert of alerts) {
    const existing = byCategory.get(alert.category)
    if (existing) {
      existing.alerts.push(alert)
      if (alert.severity === 'danger') existing.severity = 'danger'
    } else {
      byCategory.set(alert.category, { category: alert.category, severity: alert.severity, alerts: [alert] })
    }
  }
  return Array.from(byCategory.values()).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1))
}

export type ParcoursRisk = { id: string; reference: string; score: number; reasons: string[] }

/** Parcours ranked by how many distinct alert categories touch them — the ones that need attention first. */
export async function getParcoursAtRisk(alerts: Alert[]): Promise<ParcoursRisk[]> {
  const byParcours = new Map<string, { reference: string; reasons: Set<string> }>()
  const parcoursList = await db.parcours.findMany({
    where: { status: { in: [...ACTIVE_PARCOURS_STATUSES] } },
    select: { id: true, reference: true },
  })
  const idByHref = new Map(parcoursList.map((p) => [`/parcours/${p.id}`, p]))

  for (const alert of alerts) {
    const parcoursHref = alert.href.match(/^\/parcours\/([^/]+)/)
    if (!parcoursHref) continue
    const id = parcoursHref[1]!
    const parcours = idByHref.get(`/parcours/${id}`)
    if (!parcours) continue
    const entry = byParcours.get(id) ?? { reference: parcours.reference, reasons: new Set<string>() }
    entry.reasons.add(alert.category)
    byParcours.set(id, entry)
  }

  return Array.from(byParcours.entries())
    .map(([id, { reference, reasons }]) => ({ id, reference, score: reasons.size, reasons: Array.from(reasons) }))
    .sort((a, b) => b.score - a.score)
}

/** Σ contractualisations.montantHT for non-cancelled contractualisations. No objective figure is invented — PANDO hasn't given one. */
export async function getCaTotal(): Promise<number> {
  const agg = await db.contractualisation.aggregate({
    where: { status: { not: 'ANNULEE' } },
    _sum: { montantHT: true },
  })
  return agg._sum.montantHT ?? 0
}

/**
 * 🔴 Margin uses the formateur's TRUE cost (TTC for external, 0 for
 * internal — src/lib/money.ts formateurDayCost, the same function that
 * makes Sophie 720€/j and Alexandra 0€/j), never the notional day rate.
 * Each séquence's formateur cost is prorated as heures ÷ 7 "jour-équivalent"
 * — the fixtures throughout this codebase already treat 7h as a standard day.
 */
export async function getMargin(): Promise<{ revenue: number; formateurCost: number; margin: number }> {
  const revenue = await getCaTotal()

  const sequences = await db.sequence.findMany({
    where: { formateurId: { not: null }, parcours: { status: { not: 'ANNULE' } } },
    include: { formateur: true },
  })

  const formateurCost = sequences.reduce((sum, s) => {
    if (!s.formateur) return sum
    const dayCost = formateurDayCost({
      contractType: s.formateur.contractType,
      tarifJour: s.formateur.tarifJour,
      tvaRate: Number(s.formateur.tvaRate),
      forfaitDeplacement: s.formateur.forfaitDeplacement,
    })
    const dayEquivalent = Number(s.heures) / 7
    return sum + Math.round(dayCost * dayEquivalent)
  }, 0)

  return { revenue, formateurCost, margin: revenue - formateurCost }
}

export type MonthlyPoint = { label: string; value: number }

/** The last `count` calendar months, oldest first, as [start, end) boundaries — the shared clock for every monthly series below. */
function trailingMonths(count: number): { start: Date; end: Date; label: string }[] {
  const now = new Date()
  const months: { start: Date; end: Date; label: string }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    months.push({ start, end, label: start.toLocaleDateString('fr-FR', { month: 'short' }) })
  }
  return months
}

/**
 * CA contractualisé par mois — bucketed by Contractualisation.createdAt (when
 * the deal entered the system), NOT a revenue-recognition date. No accounting
 * policy is asserted here; this is "when contracted," clearly labeled as such
 * wherever it renders, not "recognized revenue" (that's an accountant's call,
 * same caution as formateurDayCost's VAT-deductibility note above).
 */
export async function getMonthlyCaSeries(months = 5): Promise<MonthlyPoint[]> {
  const buckets = trailingMonths(months)
  const results = await Promise.all(
    buckets.map(({ start, end }) =>
      db.contractualisation.aggregate({
        where: { status: { not: 'ANNULEE' }, createdAt: { gte: start, lt: end } },
        _sum: { montantHT: true },
      }),
    ),
  )
  return buckets.map((b, i) => ({ label: b.label, value: results[i]!._sum.montantHT ?? 0 }))
}

/** Participants inscrits par mois — bucketed by ParcoursParticipant.createdAt (enrollment date), an activity/growth view, not a "who's training this month" capacity view. */
export async function getMonthlyParticipantsSeries(months = 5): Promise<MonthlyPoint[]> {
  const buckets = trailingMonths(months)
  const results = await Promise.all(
    buckets.map(({ start, end }) => db.parcoursParticipant.count({ where: { createdAt: { gte: start, lt: end } } })),
  )
  return buckets.map((b, i) => ({ label: b.label, value: results[i]! }))
}
