'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import {
  generateDevis,
  generateConvention,
  generateFacture,
  generateAttestationPack,
  generateCertificatPack,
  generateConvocation,
  markChorusProSent,
  markDocumentSent,
  markDocumentSigned,
  voidDocument,
} from '@/lib/document'

export type DocumentActionState = { error?: string } | null

async function runGeneration(
  parcoursId: string,
  fn: () => Promise<unknown>,
): Promise<DocumentActionState> {
  await requireAdmin()
  try {
    await fn()
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inattendue.' }
  }
  revalidatePath(`/parcours/${parcoursId}`)
  return null
}

export async function generateDevisAction(_prev: DocumentActionState, formData: FormData) {
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateDevis(contractualisationId))
}

export async function generateConventionAction(_prev: DocumentActionState, formData: FormData) {
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateConvention(contractualisationId))
}

export async function generateFactureAction(_prev: DocumentActionState, formData: FormData) {
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateFacture(contractualisationId))
}

export async function generateAttestationPackAction(_prev: DocumentActionState, formData: FormData) {
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateAttestationPack(contractualisationId))
}

export async function generateCertificatPackAction(_prev: DocumentActionState, formData: FormData) {
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateCertificatPack(contractualisationId))
}

export async function generateConvocationAction(_prev: DocumentActionState, formData: FormData) {
  const sequenceId = String(formData.get('sequenceId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  return runGeneration(parcoursId, () => generateConvocation(sequenceId))
}

export async function markChorusProSentAction(formData: FormData) {
  await requireAdmin()
  const contractualisationId = String(formData.get('contractualisationId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!contractualisationId) return
  await markChorusProSent(contractualisationId)
  revalidatePath(`/parcours/${parcoursId}`)
}

export async function markDocumentSentAction(formData: FormData) {
  await requireAdmin()
  const documentId = String(formData.get('documentId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!documentId) return
  await markDocumentSent(documentId)
  revalidatePath(`/parcours/${parcoursId}`)
}

/** 🔴 Mocked — simulates a YouSign callback. No real signature capture happens here. */
export async function markDocumentSignedAction(formData: FormData) {
  await requireAdmin()
  const documentId = String(formData.get('documentId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  if (!documentId) return
  await markDocumentSigned(documentId)
  revalidatePath(`/parcours/${parcoursId}`)
}

export async function voidDocumentAction(formData: FormData) {
  await requireAdmin()
  const documentId = String(formData.get('documentId') ?? '')
  const parcoursId = String(formData.get('parcoursId') ?? '')
  const reason = String(formData.get('voidReason') ?? '').trim()
  if (!documentId || !reason) return
  await voidDocument(documentId, reason)
  revalidatePath(`/parcours/${parcoursId}`)
}
