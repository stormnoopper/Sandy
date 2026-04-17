'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subDays, startOfDay } from 'date-fns'
import { BarChart2, CheckCircle2, XCircle, Clock, FileText, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { GenerationRecord } from '@/lib/types'

interface GenerationAnalyticsCardProps {
  projectId: string
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

const chartConfig = {
  count: {
    label: 'Generations',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

export function GenerationAnalyticsCard({ projectId }: GenerationAnalyticsCardProps) {
  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/generation-history`)
      if (res.ok) {
        const json = await res.json()
        setRecords(
          json.records.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const total = records.length
  const completed = records.filter((r) => r.status === 'completed').length
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const avgDuration =
    completed > 0
      ? records.filter((r) => r.status === 'completed').reduce((acc, r) => acc + r.durationMs, 0) /
        completed
      : 0
  const totalOutput = records.reduce((acc, r) => acc + r.outputLength, 0)

  // Build chart data: last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 6 - i))
    const count = records.filter((r) => startOfDay(r.createdAt).getTime() === day.getTime()).length
    return { date: format(day, 'dd MMM'), count }
  })

  const statusBadge = (status: GenerationRecord['status']) => {
    if (status === 'completed')
      return (
        <Badge variant="outline" className="border-green-500 text-green-600 text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Done
        </Badge>
      )
    if (status === 'failed')
      return (
        <Badge variant="outline" className="border-red-500 text-red-600 text-xs gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )
    return (
      <Badge variant="outline" className="text-xs">
        Cancelled
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5" />
            Generation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5" />
            Generation Analytics
          </CardTitle>
          <CardDescription>AI generation history for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No AI generations yet. Generate a SOW or SRS to start tracking.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart2 className="h-5 w-5" />
          Generation Analytics
        </CardTitle>
        <CardDescription>AI generation history for this project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{successRate}%</p>
            <p className="text-xs text-muted-foreground">Success</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold">{formatDuration(Math.round(avgDuration))}</p>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold">{(totalOutput / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted-foreground">Chars out</p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">LAST 7 DAYS</p>
          <ChartContainer config={chartConfig} className="h-[120px] w-full">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Recent records */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">RECENT GENERATIONS</p>
          <div className="space-y-2">
            {records.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium uppercase text-xs">
                    {r.documentType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(r.createdAt, 'dd MMM, HH:mm')}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(r.durationMs)}
                  </span>
                  {statusBadge(r.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
