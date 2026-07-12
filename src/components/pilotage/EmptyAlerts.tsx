import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { DashboardCard } from '@/components/dashboard-card'
import { CircleCheckIcon } from 'lucide-react'

export function EmptyAlerts() {
	return (
		<DashboardCard className="gap-0 md:col-span-2 lg:col-span-4">
			<CardHeader className="border-b">
				<CardTitle className="text-base">Alertes</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center px-0">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CircleCheckIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>Rien ne nécessite d&apos;attention.</EmptyTitle>
						<EmptyDescription className="text-xs">
							Aucune alerte ouverte sur les parcours confirmés ou en cours.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</CardContent>
		</DashboardCard>
	)
}
