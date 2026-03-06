"use client"

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type TooltipProps,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Design System Colors mapping
const colors = {
    primary: "#2D3282", // Deep Indigo
    secondary: "#3a6ea5", // Cerulean
    accent: "#004e98", // Azure
    success: "#16a34a",
    warning: "#f59e0b",
    danger: "#dc2626",
    muted: "#e6e9fb",
}

interface BaseChartProps {
    data: any[]
    categories: string[] // Keys for data values
    index: string // Key for x-axis
    colors?: string[]
    valueFormatter?: (value: number) => string
    className?: string
    title?: string
    description?: string
    showGrid?: boolean
    showLegend?: boolean
}

const CustomTooltip = ({ active, payload, label, valueFormatter }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                <p className="font-semibold mb-2">{label}</p>
                {payload.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground capitalize">{item.name}:</span>
                        <span className="font-medium">
                            {valueFormatter ? valueFormatter(item.value as number) : item.value}
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export function AreaChartComponent({
    data,
    categories,
    index,
    colors: customColors,
    valueFormatter,
    className,
    title,
    description,
}: BaseChartProps) {
    const chartColors = customColors || [colors.primary, colors.secondary, colors.accent]

    return (
        <Card className={cn("overflow-hidden", className)}>
            {(title || description) && (
                <CardHeader>
                    {title && <CardTitle>{title}</CardTitle>}
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
            )}
            <CardContent className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            {categories.map((category, idx) => (
                                <linearGradient key={category} id={`color-${category}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartColors[idx % chartColors.length]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={chartColors[idx % chartColors.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.muted} />
                        <XAxis
                            dataKey={index}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            fontSize={12}
                            tick={{ fill: "#4A4A4A" }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            fontSize={12}
                            tick={{ fill: "#4A4A4A" }}
                            tickFormatter={valueFormatter}
                        />
                        <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} cursor={false} />
                        {categories.map((category, idx) => (
                            <Area
                                key={category}
                                type="monotone"
                                dataKey={category}
                                stroke={chartColors[idx % chartColors.length]}
                                fillOpacity={1}
                                fill={`url(#color-${category})`}
                                strokeWidth={2}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function BarChartComponent({
    data,
    categories,
    index,
    colors: customColors,
    valueFormatter,
    className,
    title,
    description,
}: BaseChartProps) {
    const chartColors = customColors || [colors.primary, colors.secondary, colors.accent]

    return (
        <Card className={cn("overflow-hidden", className)}>
            {(title || description) && (
                <CardHeader>
                    {title && <CardTitle>{title}</CardTitle>}
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
            )}
            <CardContent className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.muted} />
                        <XAxis
                            dataKey={index}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            fontSize={12}
                            tick={{ fill: "#4A4A4A" }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            fontSize={12}
                            tick={{ fill: "#4A4A4A" }}
                            tickFormatter={valueFormatter}
                        />
                        <Tooltip
                            content={<CustomTooltip valueFormatter={valueFormatter} />}
                            cursor={{ fill: "transparent" }}
                        />
                        {categories.map((category, idx) => (
                            <Bar
                                key={category}
                                dataKey={category}
                                fill={chartColors[idx % chartColors.length]}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
