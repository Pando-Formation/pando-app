"use client";

import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis } from "recharts";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { DashboardCard } from "@/components/dashboard-card";
import type { MonthlyPoint } from "@/lib/pilotage";
import { compactEuros } from "@/lib/money";

const chartConfig = {
	value: {
		label: "CA",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

/**
 * Single-series trend — one accent hue, hover tooltip for values (matches
 * the installed dashboard-2 chart convention). No legend: identity is
 * already named by the card title.
 */
export function CaChart({ data }: { data: MonthlyPoint[] }) {
	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader className="gap-2">
				<CardTitle>CA encaissé</CardTitle>
				<CardDescription>Depuis janvier, par date de paiement de la facture</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer className="aspect-auto h-60 w-full md:h-80" config={chartConfig}>
					<RechartsLineChart accessibilityLayer data={data} margin={{ top: 24, left: 16, right: 16 }}>
						<CartesianGrid vertical={false} className="stroke-border/50" />
						<XAxis
							axisLine={false}
							dataKey="label"
							interval={0}
							tickLine={false}
							tickMargin={10}
						/>
						<ChartTooltip
							content={<ChartTooltipContent hideLabel formatter={(value) => compactEuros(Number(value))} />}
							cursor={false}
						/>
						<Line
							dataKey="value"
							type="monotone"
							stroke="var(--color-value)"
							strokeWidth={2}
							dot={{ fill: "var(--color-value)", r: 4 }}
						/>
					</RechartsLineChart>
				</ChartContainer>
			</CardContent>
		</DashboardCard>
	);
}
