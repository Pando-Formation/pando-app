"use client";

import type * as React from "react";
import { Bar, BarChart as RechartsBarChart, XAxis } from "recharts";
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

const chartConfig = {
	value: {
		label: "Participants",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

function CustomGradientBar(
	props: React.SVGProps<SVGRectElement> & { index?: number; dataKey?: string | number }
) {
	const { fill, x = 0, y = 0, width = 0, height = 0, dataKey = "value", index = 0 } = props;
	const gid = `gradient-bar-${String(dataKey)}-${index}`;

	return (
		<>
			<rect fill={`url(#${gid})`} height={height} stroke="none" width={width} x={x} y={y} />
			<rect fill={fill} height={2} stroke="none" width={width} x={x} y={y} />
			<defs>
				<linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stopColor={fill} stopOpacity={0.5} />
					<stop offset="100%" stopColor={fill} stopOpacity={0} />
				</linearGradient>
			</defs>
		</>
	);
}

/**
 * Single-series monthly count — same gradient-bar treatment as the CA chart's
 * sibling card, hover tooltip for values, no legend needed for one series.
 */
export function ParticipantsChart({ data }: { data: MonthlyPoint[] }) {
	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader className="gap-2">
				<CardTitle>Participants inscrits</CardTitle>
				<CardDescription>5 derniers mois, par date d&apos;inscription au parcours</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer className="aspect-auto h-60 w-full md:h-80" config={chartConfig}>
					<RechartsBarChart accessibilityLayer data={data} margin={{ top: 24, left: 16, right: 16 }}>
						<XAxis
							axisLine={false}
							dataKey="label"
							interval={0}
							tickLine={false}
							tickMargin={10}
						/>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
						<Bar
							dataKey="value"
							fill="var(--color-value)"
							shape={<CustomGradientBar />}
							maxBarSize={32}
						/>
					</RechartsBarChart>
				</ChartContainer>
			</CardContent>
		</DashboardCard>
	);
}
