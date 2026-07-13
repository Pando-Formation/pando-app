import { requireOperational, hasRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { PageHero } from '@/components/page-hero'
import { ParticipantsTable, type ParticipantRow } from '@/components/participants/ParticipantsTable'

export default async function ParticipantsListPage() {
  const session = await requireOperational()
  const canWrite = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL'].some((r) =>
    hasRole(session, r as 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIAL'),
  )

  const participants = await db.participant.findMany({
    orderBy: { lastName: 'asc' },
    include: { client: { select: { companyName: true } }, _count: { select: { parcours: true } } },
  })

  return (
    <>
      <PageHero>
        <div className="t-overline" style={{ marginBottom: 'var(--space-3)' }}>
          Participants
        </div>
        <h1 className="t-title-2">Participants</h1>
      </PageHero>

      <ParticipantsTable
        canWrite={canWrite}
        data={participants.map(
          (p): ParticipantRow => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            situation: p.situation,
            clientName: p.client?.companyName ?? null,
            parcoursCount: p._count.parcours,
          }),
        )}
      />
    </>
  )
}
