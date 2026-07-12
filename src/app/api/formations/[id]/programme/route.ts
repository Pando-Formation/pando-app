import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/authz'
import { db } from '@/lib/db'
import { renderProgrammeHtml } from '@/lib/pdf/programme-template'
import { htmlToPdfBuffer } from '@/lib/pdf/pdf-engine'
import type { FormationSnapshot } from '@/lib/formation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession()
  const { id } = await params
  const versionParam = request.nextUrl.searchParams.get('version')

  const version = versionParam
    ? await db.formationVersion.findUnique({
        where: { formationId_version: { formationId: id, version: Number(versionParam) } },
      })
    : await db.formationVersion.findFirst({ where: { formationId: id }, orderBy: { version: 'desc' } })

  if (!version) return new Response('Version introuvable.', { status: 404 })

  const snapshot = version.snapshot as unknown as FormationSnapshot
  // 🔴 A blank/broken PDF must never look like a completed download — a
  // malformed snapshot fails loudly here instead of crashing into a silent
  // white page (see AGENTS.md: a missing proof is a gap, a false one is not).
  if (!snapshot || !Array.isArray(snapshot.pedagogicObjectives)) {
    return new Response(
      `Instantané invalide pour la version ${version.version} de cette formation — le programme ne peut pas être généré.`,
      { status: 500 },
    )
  }

  const html = renderProgrammeHtml(snapshot, { version: version.version, generatedAt: new Date() })
  const buffer = await htmlToPdfBuffer(html)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="programme-${snapshot.internalCode}-v${version.version}.pdf"`,
    },
  })
}
