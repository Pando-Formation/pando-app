'use client'

import { EyeIcon, FileTextIcon, MoreHorizontalIcon, SendIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { GenerateDocumentMenuItem } from '@/components/parcours/GenerateDocumentMenuItem'
import { generateParticipantConvocationAction } from '@/app/(app)/parcours/document-actions'
import { sendParticipantConvocationAction } from '@/app/(app)/parcours/communication-actions'

export function ParticipantConvocationMenu({
  parcoursId,
  parcoursParticipantId,
  canGenerate,
  document,
  convocationStatus,
}: {
  parcoursId: string
  parcoursParticipantId: string
  canGenerate: boolean
  document: { id: string } | null
  convocationStatus: string
}) {
  if (!document && !canGenerate) return null

  if (!document) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Convocation" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <GenerateDocumentMenuItem
            action={generateParticipantConvocationAction}
            parcoursId={parcoursId}
            hiddenFields={{ parcoursParticipantId }}
            label="Générer la convocation"
            icon={FileTextIcon}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (convocationStatus === 'SENT') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">Convocation envoyée</Badge>
        <Button render={<a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer" />} nativeButton={false} variant="ghost" size="icon-sm" aria-label="Voir la convocation">
          <EyeIcon />
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Convocation" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer" />}>
          <EyeIcon />
          Voir le document
        </DropdownMenuItem>
        <form action={sendParticipantConvocationAction}>
          <input type="hidden" name="parcoursId" value={parcoursId} />
          <input type="hidden" name="parcoursParticipantId" value={parcoursParticipantId} />
          <DropdownMenuItem render={<button type="submit" className="w-full" />}>
            <SendIcon />
            Envoyer par email
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
