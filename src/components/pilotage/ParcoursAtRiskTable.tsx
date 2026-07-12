import Link from 'next/link'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DashboardCard } from '@/components/dashboard-card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { CircleCheckIcon } from 'lucide-react'
import type { ParcoursRisk } from '@/lib/pilotage'

export function ParcoursAtRiskTable({ data }: { data: ParcoursRisk[] }) {
	return (
		<DashboardCard className="gap-0 md:col-span-2 lg:col-span-4">
			<CardHeader className="border-b">
				<CardTitle className="text-base">Parcours à risque</CardTitle>
			</CardHeader>
			<CardContent className="px-0">
				{data.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<CircleCheckIcon aria-hidden="true" />
							</EmptyMedia>
							<EmptyTitle>Aucun parcours à risque.</EmptyTitle>
							<EmptyDescription className="text-xs">
								Aucun parcours confirmé ou en cours n&apos;a d&apos;alerte ouverte.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="ps-6">Référence</TableHead>
								<TableHead>Raisons</TableHead>
								<TableHead className="pe-6 text-right">Alertes</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((p) => (
								<TableRow key={p.id} className="h-12">
									<TableCell className="ps-6 font-medium">
										<Link href={`/parcours/${p.id}`} style={{ textDecoration: 'none' }}>
											{p.reference}
										</Link>
									</TableCell>
									<TableCell className="max-w-80 truncate text-muted-foreground">
										{p.reasons.join(' · ')}
									</TableCell>
									<TableCell className="pe-6 text-right">
										<Badge variant="destructive">
											{p.score} alerte{p.score > 1 ? 's' : ''}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</DashboardCard>
	)
}
