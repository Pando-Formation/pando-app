import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/authz'
import { db } from '@/lib/db'
import { readDocumentFile } from '@/lib/document'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireSession()

  const document = await db.document.findUnique({ where: { id } })
  if (!document) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })

  try {
    const buffer = await readDocumentFile(document.storagePath)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fichier introuvable sur le disque.' }, { status: 500 })
  }
}
