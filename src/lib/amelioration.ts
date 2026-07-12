import { db } from '@/lib/db'
import type {
  ReclamationInput,
  ReclamationResponseInput,
  ActionInput,
  ActionOutcomeInput,
  VeilleInput,
} from '@/lib/validation/amelioration'

export async function createReclamation(input: ReclamationInput) {
  return db.reclamation.create({
    data: {
      source: input.source,
      receivedAt: new Date(input.receivedAt),
      receivedVia: input.receivedVia ?? null,
      description: input.description,
      qualification: input.qualification ?? null,
      confidentiality: input.confidentiality,
    },
  })
}

export async function respondToReclamation(id: string, input: ReclamationResponseInput) {
  return db.reclamation.update({
    where: { id },
    data: {
      responseText: input.responseText,
      responseAt: new Date(),
      closedAt: input.close ? new Date() : null,
    },
  })
}

export async function linkReclamationToAction(reclamationId: string, actionId: string) {
  return db.reclamation.update({ where: { id: reclamationId }, data: { actionId } })
}

export async function createAction(input: ActionInput) {
  return db.actionAmelioration.create({
    data: {
      origin: input.origin,
      description: input.description,
      ownerId: input.ownerId,
      dueDate: new Date(input.dueDate),
      status: 'OPEN',
    },
  })
}

/** 🔴 An outcome is required — "actioned" is not one. Marks the action DONE and records who verified it. */
export async function resolveAction(id: string, input: ActionOutcomeInput, verifiedById: string) {
  return db.actionAmelioration.update({
    where: { id },
    data: { outcome: input.outcome, status: 'DONE', verifiedAt: new Date(), verifiedById },
  })
}

export async function createVeille(input: VeilleInput, authorId: string) {
  return db.veille.create({
    data: {
      type: input.type,
      source: input.source,
      summary: input.summary,
      soWhat: input.soWhat,
      date: new Date(input.date),
      authorId,
    },
  })
}

/** Overdue = OPEN and past its dueDate — surfaced on the Slice 10 dashboard. */
export async function findOverdueActions() {
  return db.actionAmelioration.findMany({
    where: { status: 'OPEN', dueDate: { lt: new Date() } },
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { dueDate: 'asc' },
  })
}
