import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  Hourglass,
  LineChart,
  RefreshCcw,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '../utils'

export function MetricsPage() {
  const [timeRange, setTimeRange] = React.useState<'15m' | '1h' | '6h' | '24h'>('15m')

  const { data: throughputData } = useQuery({
    queryKey: ['throughput'],
    queryFn: async () => {
      const res = await fetch('/api/throughput')
      const json = await res.json()
      return json.data || []
    },
    staleTime: Infinity,
  })

  const { data: historyData } = useQuery<{ history: Record<string, number[]> }>({
    queryKey: ['metrics-history'],
    queryFn: () => fetch('/api/metrics/history').then((res) => res.json()),
    refetchInterval: 30000,
  })

  const { isPending, data: queueData } = useQuery<{ queues: any[] }>({
    queryKey: ['queues'],
    queryFn: () => fetch('/api/queues').then((res) => res.json()),
    staleTime: Infinity,
  })

  const { data: workerData } = useQuery<{ workers: any[] }>({
    queryKey: ['workers'],
    queryFn: () => fetch('/api/workers').then((res) => res.json()),
    staleTime: Infinity,
  })

  const queryClient = useQueryClient()
  // Live update from global stream
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const stats = e.detail
      if (!stats) {
        return
      }
      if (stats.queues) {
        queryClient.setQueryData(['queues'], { queues: stats.queues })
      }
      if (stats.workers) {
        queryClient.setQueryData(['workers'], { workers: stats.workers })
      }
      if (stats.throughput) {
        queryClient.setQueryData(['throughput'], stats.throughput)
      }
    }
    window.addEventListener('flux-stats-update', handler as EventListener)
    return () => window.removeEventListener('flux-stats-update', handler as EventListener)
  }, [queryClient])

  const history = historyData?.history || {}
  const queues = queueData?.queues || []
  const workers = workerData?.workers || []

  const chartData =
    throughputData?.map((d: any) => ({
      time: d.timestamp,
      value: d.count,
    })) || []

  // Calculate totals
  const totalWaiting = queues.reduce((acc, q) => acc + q.waiting, 0)
  const totalDelayed = queues.reduce((acc, q) => acc + q.delayed, 0)
  const totalFailed = queues.reduce((acc, q) => acc + q.failed, 0)
  const totalActive = queues.reduce((acc, q) => acc + q.active, 0)

  // Calculate throughput stats
  const currentThroughput = chartData[chartData.length - 1]?.value || 0
  const avgThroughput =
    chartData.length > 0
      ? Math.round(chartData.reduce((acc: number, d: any) => acc + d.value, 0) / chartData.length)
      : 0
  const maxThroughput = chartData.length > 0 ? Math.max(...chartData.map((d: any) => d.value)) : 0

  // Prepare queue distribution data
  const queueDistribution = queues.slice(0, 10).map((q) => ({
    name: q.name.length > 12 ? `${q.name.slice(0, 12)}...` : q.name,
    waiting: q.waiting,
    delayed: q.delayed,
    failed: q.failed,
  }))

  // Prepare historical sparkline data
  const historyLabels = Array.from({ length: 15 }, (_, i) => `${14 - i}m ago`)
  const sparklineData = historyLabels.map((label, i) => ({
    time: label,
    waiting: history.waiting?.[i] || 0,
    delayed: history.delayed?.[i] || 0,
    failed: history.failed?.[i] || 0,
    workers: history.workers?.[i] || 0,
  }))

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-6">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-xs">
          Loading metrics...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">System Metrics</h1>
          <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest">
            Real-time performance analytics and trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['15m', '1h', '6h', '24h'] as const).map((range) => (
            <button
              type="button"
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                timeRange === range
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={Hourglass} label="Waiting" value={totalWaiting} color="amber" />
        <StatCard icon={Clock} label="Delayed" value={totalDelayed} color="blue" />
        <StatCard icon={Activity} label="Active" value={totalActive} color="green" />
        <StatCard icon={XCircle} label="Failed" value={totalFailed} color="red" />
        <StatCard icon={CheckCircle} label="Workers" value={workers.length} color="indigo" />
        <StatCard icon={TrendingUp} label="Jobs/min" value={currentThroughput} color="primary" />
      </div>

      {/* Throughput Chart */}
      <div className="card-premium p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2">
              <LineChart size={20} className="text-primary" />
              <h3 className="text-xl font-bold tracking-tight">Throughput Over Time</h3>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mt-1">
              Jobs processed per minute
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-6">
              <div>
                <p className="text-[9px] font-black text-muted-foreground/50 uppercase">Current</p>
                <p className="text-2xl font-black text-primary">{currentThroughput}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground/50 uppercase">Average</p>
                <p className="text-2xl font-black">{avgThroughput}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground/50 uppercase">Peak</p>
                <p className="text-2xl font-black text-green-500">{maxThroughput}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorThroughput)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Distribution */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-primary" />
            <h3 className="text-lg font-bold tracking-tight">Queue Distribution</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={queueDistribution}
                margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="waiting"
                  fill="hsl(45, 93%, 47%)"
                  name="Waiting"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="delayed"
                  fill="hsl(217, 91%, 60%)"
                  name="Delayed"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="failed" fill="hsl(0, 84%, 60%)" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Trends */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} className="text-primary" />
            <h3 className="text-lg font-bold tracking-tight">15-Minute Trends</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWaiting" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="waiting"
                  stroke="hsl(45, 93%, 47%)"
                  fill="url(#colorWaiting)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="hsl(0, 84%, 60%)"
                  fill="url(#colorFailed)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: number
  color: 'amber' | 'blue' | 'green' | 'red' | 'indigo' | 'primary'
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    amber: 'text-amber-500 bg-amber-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    red: 'text-red-500 bg-red-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
    primary: 'text-primary bg-primary/10',
  }

  return (
    <div className="card-premium p-4 flex items-center gap-3">
      <div
        className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClasses[color])}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-xl font-black">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}
