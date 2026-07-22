'use client'

import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import Link from 'next/link'
import {
  CalendarClockIcon,
  SearchIcon,
  MoreHorizontalIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ClipboardCheckIcon,
  PencilIcon,
  Trash2Icon,
  VideoIcon,
} from 'lucide-react'
import { SEQUENCE_TYPE_LABELS, PREUVE_TYPE_LABELS, DEMI_JOURNEE_LABELS } from '@/lib/parcours-labels'
import { euros } from '@/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { deleteSequenceAction } from '@/app/(app)/parcours/actions'

export type SequenceRow = {
  id: string
  titre: string
  type: string
  date: string
  demiJournees: string[]
  heures: string
  montantHT: number | null
  preuveType: string
  lieu: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  visioLink: string | null
  formateurName: string | null
}

export type FormationSessionRow = {
  id: string
  titre: string
  sequences: SequenceRow[]
}

type SortKey = 'titre' | 'date'

const DEFAULT_COL_WIDTHS = {
  titre: 300,
  type: 120,
  date: 120,
  preuve: 130,
  lieu: 160,
  adresse: 240,
  visio: 150,
  formateur: 160,
}
type ColKey = keyof typeof DEFAULT_COL_WIDTHS
const MIN_COL_WIDTH = 80

function useColumnWidths() {
  const [widths, setWidths] = useState<Record<ColKey, number>>(DEFAULT_COL_WIDTHS)
  const resizing = useRef<{ key: ColKey; startX: number; startWidth: number } | null>(null)

  const onPointerMove = useCallback((e: globalThis.PointerEvent) => {
    const r = resizing.current
    if (!r) return
    const next = Math.max(MIN_COL_WIDTH, r.startWidth + (e.clientX - r.startX))
    setWidths((w) => ({ ...w, [r.key]: next }))
  }, [])

  const onPointerUp = useCallback(() => {
    resizing.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  const startResize = useCallback(
    (key: ColKey) => (e: PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      resizing.current = { key, startX: e.clientX, startWidth: widths[key] }
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [widths, onPointerMove, onPointerUp],
  )

  return { widths, startResize }
}

function colStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width }
}

function ColumnResizeHandle({ onPointerDown }: { onPointerDown: (e: PointerEvent) => void }) {
  return (
    <span
      onPointerDown={onPointerDown}
      className="absolute right-0 top-0 z-10 h-full w-2 -mr-1 cursor-col-resize touch-none select-none opacity-0 hover:opacity-100 hover:bg-primary/40"
    />
  )
}

function ResizableHead({
  label,
  className,
  width,
  onResizeStart,
}: {
  label: string
  className?: string
  width: number
  onResizeStart: (e: PointerEvent) => void
}) {
  return (
    <TableHead className={`relative ${className ?? ''}`} style={colStyle(width)}>
      {label}
      <ColumnResizeHandle onPointerDown={onResizeStart} />
    </TableHead>
  )
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
  className,
  width,
  onResizeStart,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  className?: string
  width: number
  onResizeStart: (e: PointerEvent) => void
}) {
  return (
    <TableHead className={`relative ${className ?? ''}`} style={colStyle(width)}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium text-foreground">
        {label}
        <ArrowUpDownIcon className={active ? 'opacity-100' : 'opacity-40'} style={{ width: 12, height: 12 }} />
        {active && <span className="sr-only">({direction === 'asc' ? 'croissant' : 'décroissant'})</span>}
      </button>
      <ColumnResizeHandle onPointerDown={onResizeStart} />
    </TableHead>
  )
}

function addressText(s: SequenceRow) {
  return [s.address, [s.postalCode, s.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'
}

function sessionStats(session: FormationSessionRow) {
  const sortedDates = session.sequences.map((s) => s.date).sort()
  const hours = session.sequences.reduce((sum, s) => sum + Number(s.heures), 0)
  const montantHT = session.sequences.reduce((sum, s) => sum + (s.montantHT ?? 0), 0)
  return {
    firstDate: sortedDates[0] ?? null,
    lastDate: sortedDates.at(-1) ?? null,
    hours,
    montantHT,
  }
}

export function SequencesTable({
  data,
  canWrite,
  parcoursId,
}: {
  data: FormationSessionRow[]
  canWrite: boolean
  parcoursId: string
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(() => new Set(data.map((session) => session.id)))
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(
    () => new Set(data.flatMap((session) => session.sequences.map((sequence) => sequence.id))),
  )
  const { widths, startResize } = useColumnWidths()

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleSession = (id: string) => {
    setExpandedSessions((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSequence = (id: string) => {
    setExpandedSequences((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? data
          .map((session) => ({
            ...session,
            sequences: session.sequences.filter((s) =>
              `${session.titre} ${s.titre} ${s.lieu ?? ''} ${s.city ?? ''} ${s.formateurName ?? ''}`.toLowerCase().includes(q),
            ),
          }))
          .filter((session) => session.titre.toLowerCase().includes(q) || session.sequences.length > 0)
      : data

    return filtered.map((session) => {
      const sequences = [...session.sequences].sort((a, b) => {
        const cmp = sortKey === 'titre' ? a.titre.localeCompare(b.titre) : a.date.localeCompare(b.date)
        return sortDir === 'asc' ? cmp : -cmp
      })
      return { ...session, sequences }
    })
  }, [data, query, sortKey, sortDir])

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <CalendarClockIcon style={{ width: 16, height: 16 }} className="text-muted-foreground" />
          <CardTitle className="text-base">Sessions</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground"
              style={{ width: 14, height: 14, left: 10 }}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une session..."
              className="w-64"
              style={{ paddingLeft: 30 }}
            />
          </div>
          {canWrite && (
            <Button render={<Link href={`/parcours/${parcoursId}/sessions/nouveau`} />} nativeButton={false} size="sm">
              <PlusIcon />
              Ajouter une session
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="t-caption-1" style={{ padding: 'var(--space-6)' }}>
            {data.length === 0
              ? "Aucune session — créez une session, puis ajoutez ses séquences depuis la ligne principale."
              : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Session / séquence"
                  active={sortKey === 'titre'}
                  direction={sortDir}
                  onClick={() => toggleSort('titre')}
                  className="ps-6"
                  width={widths.titre}
                  onResizeStart={startResize('titre')}
                />
                <ResizableHead label="Type" width={widths.type} onResizeStart={startResize('type')} />
                <SortableHead
                  label="Date"
                  active={sortKey === 'date'}
                  direction={sortDir}
                  onClick={() => toggleSort('date')}
                  width={widths.date}
                  onResizeStart={startResize('date')}
                />
                <ResizableHead label="Preuve" width={widths.preuve} onResizeStart={startResize('preuve')} />
                <ResizableHead label="Lieu" width={widths.lieu} onResizeStart={startResize('lieu')} />
                <ResizableHead label="Adresse" width={widths.adresse} onResizeStart={startResize('adresse')} />
                <ResizableHead label="Visio" width={widths.visio} onResizeStart={startResize('visio')} />
                <ResizableHead label="Formateur" width={widths.formateur} onResizeStart={startResize('formateur')} />
                <TableHead className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((session) => {
                const stats = sessionStats(session)
                const sessionOpen = expandedSessions.has(session.id)
                return (
                  <Fragment key={session.id}>
                    <TableRow className="bg-muted/30">
                      <TableCell className="ps-6 align-top whitespace-normal py-5" style={colStyle(widths.titre)}>
                        <div className="flex items-start gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={sessionOpen ? `Replier ${session.titre}` : `Déplier ${session.titre}`}
                            aria-expanded={sessionOpen}
                            onClick={() => toggleSession(session.id)}
                          >
                            {sessionOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          </Button>
                          <div>
                            <span className="font-medium">{session.titre}</span>
                            <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                              {session.sequences.length} séquence{session.sequences.length > 1 ? 's' : ''} · {stats.hours}h ·{' '}
                              {euros(stats.montantHT)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-5" style={colStyle(widths.type)}>
                        <Badge variant="accent">Session</Badge>
                      </TableCell>
                      <TableCell className="align-top py-5 text-muted-foreground" style={colStyle(widths.date)}>
                        {stats.firstDate && stats.lastDate
                          ? stats.firstDate === stats.lastDate
                            ? new Date(stats.firstDate).toLocaleDateString('fr-FR')
                            : `${new Date(stats.firstDate).toLocaleDateString('fr-FR')} → ${new Date(stats.lastDate).toLocaleDateString('fr-FR')}`
                          : '—'}
                      </TableCell>
                      <TableCell className="align-top py-5" style={colStyle(widths.preuve)} />
                      <TableCell className="align-top py-5" style={colStyle(widths.lieu)} />
                      <TableCell className="align-top py-5" style={colStyle(widths.adresse)} />
                      <TableCell className="align-top py-5" style={colStyle(widths.visio)} />
                      <TableCell className="align-top py-5" style={colStyle(widths.formateur)} />
                      <TableCell className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 align-top py-5 text-right">
                        {canWrite && (
                          <Button
                            render={<Link href={`/parcours/${parcoursId}/sessions/${session.id}/sequences/nouveau`} />}
                            nativeButton={false}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Ajouter une séquence à ${session.titre}`}
                          >
                            <PlusIcon />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {sessionOpen && session.sequences.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-4 ps-14 text-muted-foreground">
                          Aucune séquence dans cette session.
                        </TableCell>
                      </TableRow>
                    ) : sessionOpen ? (
                      session.sequences.map((s) => {
                        const hasMultipleDj = s.demiJournees.length > 1
                        const sequenceOpen = expandedSequences.has(s.id)

                        return (
                          <Fragment key={s.id}>
                            <TableRow className="group">
                              <TableCell className="ps-12 align-top whitespace-normal py-5" style={colStyle(widths.titre)}>
                                <div className="flex items-start gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={sequenceOpen ? `Replier ${s.titre}` : `Déplier ${s.titre}`}
                                    aria-expanded={sequenceOpen}
                                    onClick={() => toggleSequence(s.id)}
                                  >
                                    {sequenceOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                  </Button>
                                  <div>
                                    <span className="font-medium">{s.titre}</span>
                                    <p className="t-caption-1" style={{ marginTop: 'var(--space-2)' }}>
                                      {hasMultipleDj
                                        ? `${s.demiJournees.length} demi-journées · ${s.heures}h`
                                        : `${s.demiJournees.map((dj) => DEMI_JOURNEE_LABELS[dj] ?? dj).join(' + ')} · ${s.heures}h`}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="align-top py-5" style={colStyle(widths.type)}>
                                <Badge variant="secondary">{SEQUENCE_TYPE_LABELS[s.type] ?? s.type}</Badge>
                              </TableCell>
                              <TableCell className="align-top py-5 text-muted-foreground" style={colStyle(widths.date)}>
                                {new Date(s.date).toLocaleDateString('fr-FR')}
                              </TableCell>
                              <TableCell className="align-top py-5" style={colStyle(widths.preuve)}>
                                <Badge variant="secondary">{PREUVE_TYPE_LABELS[s.preuveType] ?? s.preuveType}</Badge>
                              </TableCell>
                              <TableCell
                                className="truncate align-top py-5 text-muted-foreground"
                                style={colStyle(widths.lieu)}
                                title={s.lieu ?? undefined}
                              >
                                {s.lieu ?? '—'}
                              </TableCell>
                              <TableCell
                                className="truncate align-top py-5 text-muted-foreground"
                                style={colStyle(widths.adresse)}
                                title={addressText(s)}
                              >
                                {addressText(s)}
                              </TableCell>
                              <TableCell className="align-top py-5" style={colStyle(widths.visio)}>
                                {s.visioLink ? (
                                  <Badge variant="secondary" render={<a href={s.visioLink} target="_blank" rel="noreferrer" />}>
                                    <VideoIcon style={{ width: 12, height: 12 }} />
                                    Rejoindre ↗
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell
                                className="truncate align-top py-5 text-muted-foreground"
                                style={colStyle(widths.formateur)}
                                title={s.formateurName ?? undefined}
                              >
                                {s.formateurName ?? '—'}
                              </TableCell>
                              <TableCell className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 align-top py-5 text-right group-hover:bg-muted/50">
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                                    <MoreHorizontalIcon />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-56">
                                    {!hasMultipleDj && (
                                      <DropdownMenuItem render={<Link href={`/parcours/${parcoursId}/sequences/${s.id}/emargement`} />}>
                                        <ClipboardCheckIcon />
                                        Émargement
                                      </DropdownMenuItem>
                                    )}
                                    {canWrite && (
                                      <DropdownMenuItem render={<Link href={`/parcours/${parcoursId}/sequences/${s.id}/modifier`} />}>
                                        <PencilIcon />
                                        Modifier
                                      </DropdownMenuItem>
                                    )}
                                    {canWrite && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <form action={deleteSequenceAction}>
                                          <input type="hidden" name="id" value={s.id} />
                                          <input type="hidden" name="parcoursId" value={parcoursId} />
                                          <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
                                            <Trash2Icon />
                                            Retirer
                                          </DropdownMenuItem>
                                        </form>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>

                            {sequenceOpen &&
                              s.demiJournees.map((dj) => (
                                <TableRow key={`${s.id}-${dj}`} className="bg-muted/20">
                                  <TableCell className="ps-20 align-top py-3" style={colStyle(widths.titre)}>
                                    <span className="text-muted-foreground">{DEMI_JOURNEE_LABELS[dj] ?? dj}</span>
                                  </TableCell>
                                  <TableCell className="align-top py-3" style={colStyle(widths.type)} />
                                  <TableCell className="align-top py-3" style={colStyle(widths.date)} />
                                  <TableCell className="align-top py-3" style={colStyle(widths.preuve)} />
                                  <TableCell className="align-top py-3" style={colStyle(widths.lieu)} />
                                  <TableCell className="align-top py-3" style={colStyle(widths.adresse)} />
                                  <TableCell className="align-top py-3" style={colStyle(widths.visio)} />
                                  <TableCell className="align-top py-3" style={colStyle(widths.formateur)} />
                                  <TableCell className="sticky right-0 z-10 min-w-[70px] border-l bg-card pe-6 align-top py-3 text-right">
                                    <Button
                                      render={<Link href={`/parcours/${parcoursId}/sequences/${s.id}/emargement#dj-${dj}`} />}
                                      nativeButton={false}
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Émargement — ${DEMI_JOURNEE_LABELS[dj] ?? dj}`}
                                    >
                                      <ClipboardCheckIcon />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </Fragment>
                        )
                      })
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
