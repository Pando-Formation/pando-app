import { CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { DashboardCard } from "@/components/dashboard-card";

export type FinancialStat = {
	label: string;
	value: string;
	deltaPct?: number;
	deltaLabel?: string;
};

/**
 * Deliberately the smallest visual weight on the page — this is a risk
 * radar, not a vanity dashboard. Alerts stay the focus; these are context.
 */
export function FinancialStats({ stats }: { stats: FinancialStat[] }) {
	return (
		<>
			{stats.map((s) => (
				<DashboardCard key={s.label}>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="font-normal text-xs tracking-wide">{s.label}</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-row items-center gap-2">
						<p className="font-semibold text-2xl tabular-nums">{s.value}</p>
					</CardContent>
					{s.deltaPct !== undefined && (
						<CardFooter className="gap-1 rounded-none bg-background text-xs">
							<Delta value={s.deltaPct}>
								<DeltaIcon />
								<DeltaValue />
							</Delta>
							<span className="text-muted-foreground">{s.deltaLabel}</span>
						</CardFooter>
					)}
				</DashboardCard>
			))}
		</>
	);
}
