'use client'

import { useRef } from 'react'
import { EyeIcon, SendIcon, CheckCircleIcon, Trash2Icon } from 'lucide-react'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-labels'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { markDocumentSentAction, markDocumentSignedAction, voidDocumentAction } from '@/app/(app)/parcours/document-actions'

export type DocumentRow = {
  id: string
  type: string
  signatureStatus: string
  isVoid: boolean
}

/** Badge + dropdown (Voir/Marquer envoyé/Marquer signé/Supprimer) for one Document row — shared across every parcours-scoped table, since markDocumentSent/Signed/void are already keyed by documentId alone. */
export function DocumentBadgeMenu({ doc, parcoursId, canWrite }: { doc: DocumentRow; parcoursId: string; canWrite: boolean }) {
  const voidFormRef = useRef<HTMLFormElement>(null)
  const voidReasonRef = useRef<HTMLInputElement>(null)
  const canMarkSent = canWrite && !doc.isVoid && doc.signatureStatus === 'PENDING'
  const canMarkSigned = canWrite && !doc.isVoid && (doc.signatureStatus === 'SENT' || doc.signatureStatus === 'PENDING')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Badge
            variant={
              doc.isVoid
                ? 'destructive'
                : doc.signatureStatus === 'SIGNED'
                  ? 'success'
                  : doc.signatureStatus === 'SENT'
                    ? 'accent'
                    : 'secondary'
            }
            style={{ marginRight: 'var(--space-2)', marginBottom: 'var(--space-2)', cursor: 'pointer' }}
          />
        }
        nativeButton={false}
      >
        {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem render={<a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" />}>
          <EyeIcon />
          Voir le document
        </DropdownMenuItem>
        {canMarkSent && (
          <form action={markDocumentSentAction}>
            <input type="hidden" name="documentId" value={doc.id} />
            <input type="hidden" name="parcoursId" value={parcoursId} />
            <DropdownMenuItem render={<button type="submit" className="w-full" />}>
              <SendIcon />
              Marquer envoyé
            </DropdownMenuItem>
          </form>
        )}
        {canMarkSigned && (
          <form action={markDocumentSignedAction}>
            <input type="hidden" name="documentId" value={doc.id} />
            <input type="hidden" name="parcoursId" value={parcoursId} />
            <DropdownMenuItem render={<button type="submit" className="w-full" />}>
              <CheckCircleIcon />
              Marquer signé (simulation)
            </DropdownMenuItem>
          </form>
        )}
        {canWrite && !doc.isVoid && (
          <>
            <DropdownMenuSeparator />
            <form ref={voidFormRef} action={voidDocumentAction}>
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="parcoursId" value={parcoursId} />
              <input type="hidden" name="voidReason" ref={voidReasonRef} />
              <DropdownMenuItem
                variant="destructive"
                render={
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      const reason = window.prompt("Raison de l'annulation du document :")
                      if (!reason) return
                      if (voidReasonRef.current) voidReasonRef.current.value = reason
                      voidFormRef.current?.requestSubmit()
                    }}
                  />
                }
              >
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </form>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
