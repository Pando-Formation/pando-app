import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { euros } from '@/lib/money'
import {
  TRACK_LABELS,
  PARCOURS_STATUS_LABELS,
  PANDO_ROLE_LABELS,
  SEQUENCE_TYPE_LABELS,
  PREUVE_TYPE_LABELS,
  DEMI_JOURNEE_LABELS,
} from '@/lib/parcours-labels'
import { PAYER_TYPE_LABELS, CONTRACTUALISATION_STATUS_LABELS, PARTICIPANT_STATUS_LABELS } from '@/lib/participant-labels'
import { DOCUMENT_TYPE_LABELS, SIGNATURE_STATUS_LABELS } from '@/lib/document-labels'
import { computePaymentTriggerDate } from '@/lib/participant'
import { deleteSequenceAction, addFinancementAction } from '@/app/(app)/parcours/actions'
import {
  generateDevisAction,
  generateConventionAction,
  generateFactureAction,
  generateAttestationPackAction,
  generateCertificatPackAction,
  generateConvocationAction,
  markChorusProSentAction,
  markDocumentSentAction,
  markDocumentSignedAction,
} from '@/app/(app)/parcours/document-actions'
import { GenerateDocumentButton } from '@/components/participants/GenerateDocumentButton'
import { DELIVERY_STATUS_LABELS, deliveryStatusBadgeClass } from '@/lib/communication-labels'
import { sendConvocationsAction, simulateDeliveryAction } from '@/app/(app)/parcours/communication-actions'
import type { FormationSnapshot } from '@/lib/formation'

export default async function ParcoursDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN'].some((r) => hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN'))

  const parcours = await db.parcours.findUnique({
    where: { id },
    include: {
      formationVersion: true,
      client: { select: { companyName: true } },
      beneficiaire: { select: { companyName: true } },
      donneurOrdre: { select: { companyName: true } },
      sequences: {
        orderBy: { ordre: 'asc' },
        include: { formateur: { select: { firstName: true, lastName: true } }, documents: true },
      },
      contractualisations: {
        orderBy: { createdAt: 'asc' },
        include: {
          payerClient: { select: { companyName: true, isPublicSector: true } },
          payerParticipant: { select: { firstName: true, lastName: true } },
          financeur: { select: { name: true } },
          financements: true,
          documents: { orderBy: { createdAt: 'desc' } },
          _count: { select: { participants: true } },
        },
      },
      participants: {
        orderBy: { createdAt: 'asc' },
        include: { participant: true, contractualisation: { select: { payerType: true } } },
      },
      communicationSequences: {
        include: { messages: { orderBy: { createdAt: 'desc' } } },
      },
    },
  })
  if (!parcours) notFound()

  const messages = parcours.communicationSequences.flatMap((cs) => cs.messages)

  const snapshot = parcours.formationVersion.snapshot as unknown as FormationSnapshot

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
            Parcours
          </div>
          <h1 className="t-title-2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {parcours.reference}
            <span className="badge badge-neutral">{PARCOURS_STATUS_LABELS[parcours.status] ?? parcours.status}</span>
          </h1>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            {snapshot.title} (v{parcours.formationVersion.version})
          </p>
        </div>
        {canWrite && (
          <Link href={`/parcours/${parcours.id}/modifier`} className="btn btn-md btn-secondary">
            Modifier
          </Link>
        )}
      </div>

      {parcours.status === 'ANNULE' && parcours.cancellationReason && (
        <div className="card" style={{ borderColor: 'var(--color-danger)', marginBottom: 'var(--space-6)' }}>
          <span className="badge badge-danger">Annulé</span>
          <p className="t-body-sm" style={{ marginTop: 'var(--space-3)' }}>
            {parcours.cancellationReason}
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Cadre
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <Field label="Track" value={TRACK_LABELS[parcours.track] ?? parcours.track} />
          <Field label="Rôle PANDO" value={PANDO_ROLE_LABELS[parcours.pandoRole] ?? parcours.pandoRole} />
          <Field label="Client" value={parcours.client?.companyName ?? '— (inter)'} />
          <Field label="Bénéficiaire" value={parcours.beneficiaire?.companyName ?? '—'} />
          {parcours.pandoRole === 'SOUS_TRAITANT' && (
            <Field label="Donneur d'ordre" value={parcours.donneurOrdre?.companyName ?? '—'} />
          )}
          <Field
            label="Effectif"
            value={
              parcours.minParticipants || parcours.maxParticipants
                ? `${parcours.minParticipants ?? '?'} – ${parcours.maxParticipants ?? '?'}`
                : '—'
            }
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="t-heading" style={{ marginBottom: 'var(--space-5)' }}>
          Dérivé des séquences — lecture seule
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-5)' }}>
          <Field label="Début" value={parcours.dateDebut ? new Date(parcours.dateDebut).toLocaleDateString('fr-FR') : '—'} />
          <Field label="Fin" value={parcours.dateFin ? new Date(parcours.dateFin).toLocaleDateString('fr-FR') : '—'} />
          <Field label="Durée totale" value={`${parcours.totalHours.toString()} h`} />
          <Field label="Montant HT" value={euros(parcours.montantHT)} />
        </div>
        <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
          Aucun champ ci-dessus n&apos;est saisi à la main — modifier une séquence recalcule automatiquement ces
          quatre valeurs.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h2 className="t-heading">Séquences ({parcours.sequences.length})</h2>
        {canWrite && (
          <Link href={`/parcours/${parcours.id}/sequences/nouveau`} className="btn btn-sm btn-primary">
            Ajouter une séquence
          </Link>
        )}
      </div>

      {parcours.sequences.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucune séquence — les dates et la durée totale resteront vides tant qu&apos;aucune n&apos;est ajoutée.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {parcours.sequences.map((s) => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span className="t-caption-1">#{s.ordre}</span>
                    <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                      {s.titre}
                    </span>
                    <span className="badge badge-neutral">{SEQUENCE_TYPE_LABELS[s.type] ?? s.type}</span>
                  </div>
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                    {new Date(s.date).toLocaleDateString('fr-FR')} ·{' '}
                    {s.demiJournees.map((dj) => DEMI_JOURNEE_LABELS[dj] ?? dj).join(' + ')} · {s.heures.toString()}h ·{' '}
                    preuve : {PREUVE_TYPE_LABELS[s.preuveType] ?? s.preuveType}
                    {s.lieu && <> · {s.lieu}</>}
                    {s.formateur && (
                      <>
                        {' '}
                        · {s.formateur.firstName} {s.formateur.lastName}
                      </>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Link href={`/parcours/${parcours.id}/sequences/${s.id}/emargement`} className="btn btn-sm btn-secondary">
                    Émargement
                  </Link>
                  {canWrite && (
                    <>
                      <Link href={`/parcours/${parcours.id}/sequences/${s.id}/modifier`} className="btn btn-sm btn-ghost">
                        Modifier
                      </Link>
                      <form action={deleteSequenceAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="parcoursId" value={parcours.id} />
                        <button type="submit" className="btn btn-sm btn-ghost">
                          Retirer
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>

              {(s.documents.length > 0 || canWrite) && (
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-subtle)' }}>
                  {s.documents.map((d) => (
                    <a
                      key={d.id}
                      href={`/api/documents/${d.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="badge badge-neutral"
                      style={{ marginRight: 'var(--space-3)', textDecoration: 'none' }}
                    >
                      {DOCUMENT_TYPE_LABELS[d.type] ?? d.type} ↗
                    </a>
                  ))}
                  {canWrite && (
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <GenerateDocumentButton
                        action={generateConvocationAction}
                        parcoursId={parcours.id}
                        hiddenFields={{ sequenceId: s.id }}
                        label="Générer la convocation"
                      />
                      <form action={sendConvocationsAction}>
                        <input type="hidden" name="sequenceId" value={s.id} />
                        <input type="hidden" name="parcoursId" value={parcours.id} />
                        <button type="submit" className="btn btn-sm btn-primary">
                          Envoyer les convocations
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-9)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <h2 className="t-heading">Contractualisations ({parcours.contractualisations.length})</h2>
        {canWrite && (
          <Link href={`/parcours/${parcours.id}/contractualisations/nouveau`} className="btn btn-sm btn-primary">
            Ajouter une contractualisation
          </Link>
        )}
      </div>

      {parcours.contractualisations.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucune contractualisation — le montant HT du parcours restera à 0 €.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {parcours.contractualisations.map((c) => {
            const payerName =
              c.payerClient?.companyName ??
              (c.payerParticipant ? `${c.payerParticipant.firstName} ${c.payerParticipant.lastName}` : null) ??
              c.financeur?.name ??
              '—'
            const paymentTrigger =
              c.payerType === 'INDIVIDU' && c.retractationEndsAt && parcours.dateDebut
                ? computePaymentTriggerDate(parcours.dateDebut, c.retractationEndsAt)
                : null
            return (
              <div key={c.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="badge badge-neutral">{PAYER_TYPE_LABELS[c.payerType] ?? c.payerType}</span>
                      <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                        {payerName}
                      </span>
                      <span className="badge badge-accent">
                        {CONTRACTUALISATION_STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                      {euros(c.montantHT)} HT{c.remise > 0 && <> · remise {euros(c.remise)}</>} ·{' '}
                      {c._count.participants} participant{c._count.participants > 1 ? 's' : ''}
                      {c.numeroEngagement && <> · engagement {c.numeroEngagement}</>}
                    </p>
                  </div>
                  {canWrite && (
                    <Link href={`/parcours/${parcours.id}/contractualisations/${c.id}/modifier`} className="btn btn-sm btn-ghost">
                      Modifier
                    </Link>
                  )}
                </div>

                {c.payerType === 'INDIVIDU' && c.retractationEndsAt && (
                  <div className="badge badge-warning" style={{ marginTop: 'var(--space-3)' }}>
                    Rétractation jusqu&apos;au {new Date(c.retractationEndsAt).toLocaleDateString('fr-FR')} — aucun
                    paiement ne peut être demandé avant.
                    {paymentTrigger && (
                      <> Déclenchement du paiement : {paymentTrigger.toLocaleDateString('fr-FR')} (max J-2, rétractation).</>
                    )}
                  </div>
                )}

                {c.financements.length > 0 && (
                  <p className="t-caption-1" style={{ marginTop: 'var(--space-3)' }}>
                    Financement{c.financements.length > 1 ? 's' : ''} :{' '}
                    {c.financements.map((f) => `${f.type} (${euros(f.montantPrisEnCharge)})`).join(' · ')}
                  </p>
                )}

                {canWrite && (
                  <form action={addFinancementAction} style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', alignItems: 'flex-end' }}>
                    <input type="hidden" name="contractualisationId" value={c.id} />
                    <input type="hidden" name="parcoursId" value={parcours.id} />
                    <div>
                      <label className="input-label">Type de financement</label>
                      <select className="input" name="type" defaultValue="ENTREPRISE_DIRECTE">
                        <option value="ENTREPRISE_DIRECTE">Entreprise directe</option>
                        <option value="OPCO">OPCO</option>
                        <option value="CPF">CPF</option>
                        <option value="FONDS_PROPRES">Fonds propres</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Montant pris en charge (€)</label>
                      <input className="input" type="number" step="0.01" min="0" name="montantPrisEnCharge" />
                    </div>
                    <button type="submit" className="btn btn-sm btn-secondary">
                      Ajouter un financement
                    </button>
                  </form>
                )}

                <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <h3 className="t-caption-1" style={{ marginBottom: 'var(--space-3)' }}>
                    Documents ({c.documents.length})
                  </h3>

                  {c.documents.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                      {c.documents.map((d) => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="t-body-sm">
                            {DOCUMENT_TYPE_LABELS[d.type] ?? d.type} ↗
                          </a>
                          <span className={`badge ${d.signatureStatus === 'SIGNED' ? 'badge-accent' : 'badge-neutral'}`}>
                            {SIGNATURE_STATUS_LABELS[d.signatureStatus] ?? d.signatureStatus}
                          </span>
                          {d.isVoid && <span className="badge badge-danger">Annulé</span>}
                          {canWrite && !d.isVoid && d.signatureStatus === 'PENDING' && (
                            <form action={markDocumentSentAction}>
                              <input type="hidden" name="documentId" value={d.id} />
                              <input type="hidden" name="parcoursId" value={parcours.id} />
                              <button type="submit" className="btn btn-sm btn-ghost">
                                Marquer envoyé
                              </button>
                            </form>
                          )}
                          {canWrite && !d.isVoid && (d.signatureStatus === 'SENT' || d.signatureStatus === 'PENDING') && (
                            <form action={markDocumentSignedAction}>
                              <input type="hidden" name="documentId" value={d.id} />
                              <input type="hidden" name="parcoursId" value={parcours.id} />
                              <button type="submit" className="btn btn-sm btn-ghost">
                                Marquer signé (simulation — pas de YouSign réel)
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canWrite && (
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <GenerateDocumentButton action={generateDevisAction} parcoursId={parcours.id} hiddenFields={{ contractualisationId: c.id }} label="Générer le devis" />
                      <GenerateDocumentButton
                        action={generateConventionAction}
                        parcoursId={parcours.id}
                        hiddenFields={{ contractualisationId: c.id }}
                        label={c.payerType === 'INDIVIDU' ? 'Générer le contrat' : 'Générer la convention'}
                      />
                      <GenerateDocumentButton action={generateFactureAction} parcoursId={parcours.id} hiddenFields={{ contractualisationId: c.id }} label="Générer la facture" />
                      <GenerateDocumentButton
                        action={generateAttestationPackAction}
                        parcoursId={parcours.id}
                        hiddenFields={{ contractualisationId: c.id }}
                        label="Attestations (ce payeur uniquement)"
                      />
                      <GenerateDocumentButton
                        action={generateCertificatPackAction}
                        parcoursId={parcours.id}
                        hiddenFields={{ contractualisationId: c.id }}
                        label="Certificats de réalisation"
                      />
                    </div>
                  )}

                  {c.payerClient?.isPublicSector && (
                    <div style={{ marginTop: 'var(--space-4)' }}>
                      {c.chorusProSentAt ? (
                        <span className="badge badge-accent">
                          Envoyé sur Chorus Pro le {new Date(c.chorusProSentAt).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        canWrite && (
                          <form action={markChorusProSentAction}>
                            <input type="hidden" name="contractualisationId" value={c.id} />
                            <input type="hidden" name="parcoursId" value={parcours.id} />
                            <button type="submit" className="btn btn-sm btn-secondary" disabled={!c.numeroEngagement || !c.codeService}>
                              Marquer envoyé sur Chorus Pro (upload manuel)
                            </button>
                          </form>
                        )
                      )}
                      {!c.numeroEngagement || !c.codeService ? (
                        <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                          N° d&apos;engagement et code service requis avant facturation — voir Modifier.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-9)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <h2 className="t-heading">Participants ({parcours.participants.length})</h2>
        {canWrite && (
          <Link href={`/parcours/${parcours.id}/participants/nouveau`} className="btn btn-sm btn-primary">
            Inscrire un participant
          </Link>
        )}
      </div>

      {parcours.participants.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun participant inscrit.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {parcours.participants.map((pp) => (
            <div key={pp.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                    {pp.participant.firstName} {pp.participant.lastName}
                  </span>
                  <span className="badge badge-neutral">{PARTICIPANT_STATUS_LABELS[pp.status] ?? pp.status}</span>
                  {pp.besoinAccessibilite && (
                    <span className={`badge ${pp.adaptationTraceeAt ? 'badge-accent' : 'badge-danger'}`}>
                      {pp.adaptationTraceeAt ? 'Accessibilité tracée' : 'Accessibilité NON tracée'}
                    </span>
                  )}
                </div>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {pp.contractualisation ? PAYER_TYPE_LABELS[pp.contractualisation.payerType] : 'Aucun payeur assigné'} ·{' '}
                  {pp.hoursAttended.toString()}h assistées
                  {pp.status === 'ABANDON' && pp.abandonReason && <> · {pp.abandonReason}</>}
                </p>
              </div>
              {canWrite && (
                <Link href={`/parcours/${parcours.id}/participants/${pp.id}/modifier`} className="btn btn-sm btn-ghost">
                  Gérer
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="t-heading" style={{ marginTop: 'var(--space-9)', marginBottom: 'var(--space-3)' }}>
        Envois &amp; preuve de livraison ({messages.length})
      </h2>
      <p className="t-caption-1" style={{ marginBottom: 'var(--space-5)' }}>
        🔴 Envoi simulé — aucun compte Brevo réel n&apos;est branché. Les boutons « Simuler » jouent le rôle d&apos;un
        webhook de livraison, pour montrer la règle qui compte : un échec ne s&apos;affiche JAMAIS en vert.
      </p>

      {messages.length === 0 ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>
          Aucun envoi pour le moment — utilisez « Envoyer les convocations » sur une séquence.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {messages.map((m) => (
            <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="t-heading" style={{ color: 'var(--color-text-primary)' }}>
                    {m.subject}
                  </span>
                  <span className={`badge ${deliveryStatusBadgeClass(m.deliveryStatus)}`}>
                    {DELIVERY_STATUS_LABELS[m.deliveryStatus] ?? m.deliveryStatus}
                  </span>
                </div>
                <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                  {m.recipientEmail}
                  {m.deliveryStatus === 'SOFT_BOUNCE' && <> · tentative {m.retryCount}/2 avant escalade</>}
                  {m.deliveredAt && <> · livré le {new Date(m.deliveredAt).toLocaleString('fr-FR')}</>}
                  {m.bouncedAt && !m.deliveredAt && <> · échec le {new Date(m.bouncedAt).toLocaleString('fr-FR')}</>}
                </p>
              </div>
              {canWrite && ['SENT', 'SOFT_BOUNCE'].includes(m.deliveryStatus) && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {[
                    { outcome: 'DELIVERED', label: 'Simuler : livré' },
                    { outcome: 'HARD_BOUNCE', label: 'Simuler : échec dur' },
                    { outcome: 'SOFT_BOUNCE', label: 'Simuler : bounce doux' },
                  ].map((sim) => (
                    <form key={sim.outcome} action={simulateDeliveryAction}>
                      <input type="hidden" name="messageId" value={m.id} />
                      <input type="hidden" name="parcoursId" value={parcours.id} />
                      <input type="hidden" name="outcome" value={sim.outcome} />
                      <button type="submit" className="btn btn-sm btn-ghost">
                        {sim.label}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-caption-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
      <div className="t-body-sm">{value}</div>
    </div>
  )
}
