import Link from 'next/link'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCard } from '@/components/dashboard-card'
import { SeverityDot } from '@/components/pilotage/SeverityDot'
import type { AlertGroup } from '@/lib/pilotage'

export function AlertCard({ group }: { group: AlertGroup }) {
	return (
		<DashboardCard className="gap-0 md:col-span-2 lg:col-span-4">
			<CardHeader className="flex flex-row items-center gap-2 border-b">
				<SeverityDot severity={group.severity} />
				<CardTitle className="flex-1 text-base">{group.category}</CardTitle>
				<CardDescription>
					{group.alerts.length} alerte{group.alerts.length > 1 ? 's' : ''}
				</CardDescription>
			</CardHeader>
			<CardContent className="divide-y divide-border px-0">
				{group.alerts.map((a, i) => (
					<Link
						key={i}
						href={a.href}
						className="t-body-sm flex h-12 items-center justify-between gap-3 px-6 transition-colors hover:bg-muted/50"
						style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
					>
						<span className="truncate">{a.message}</span>
						<span aria-hidden className="shrink-0">
							→
						</span>
					</Link>
				))}
			</CardContent>
		</DashboardCard>
	)
}
