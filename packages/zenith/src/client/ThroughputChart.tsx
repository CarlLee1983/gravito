import { useQuery } from '@tanstack/react-query'
import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ThroughputPoint {
  timestamp: string
  count: number
}

export function ThroughputChart() {
  // Initial fetch via React Query
  const { data: initialData } = useQuery({
    queryKey: ['throughput'],
    queryFn: async () => {
      const res = await fetch('/api/throughput')
      const json = await res.json()
      return json.data || []
    },
    staleTime: Infinity, // Don't refetch automatically
  })

  const [throughputData, setThroughputData] = React.useState<ThroughputPoint[]>([])

  // Sync with initial data
  React.useEffect(() => {
    if (initialData) {
      setThroughputData(initialData)
    }
  }, [initialData])

  // Listen for live updates
  React.useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.throughput) {
        setThroughputData(customEvent.detail.throughput)
      }
    }
    window.addEventListener('flux-stats-update', handler)
    return () => window.removeEventListener('flux-stats-update', handler)
  }, [])

  const chartData =
    throughputData?.map((d: ThroughputPoint) => ({
      time: d.timestamp,
      value: d.count,
    })) || []
  return (
    <div className="card-premium h-[350px] w-full p-6 flex flex-col relative overflow-hidden group">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

      <div className="flex justify-between items-start mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black tracking-tight font-heading">System Throughput</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/20">
              <span className="w-1 h-1 bg-primary rounded-full animate-ping"></span>
              Live
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mt-1">
            Jobs processed per minute
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-foreground font-mono">
            {chartData[chartData.length - 1]?.value || 0}
          </p>
          <p className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter">
            Current Rate
          </p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 9,
                fill: 'hsl(var(--muted-foreground))',
                fontWeight: 700,
                fontFamily: 'Fira Code',
              }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 9,
                fill: 'hsl(var(--muted-foreground))',
                fontWeight: 700,
                fontFamily: 'Fira Code',
              }}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{
                backgroundColor: 'rgba(9, 9, 11, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'Fira Code',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                backdropFilter: 'blur(8px)',
              }}
              itemStyle={{ fontWeight: 'bold', color: 'hsl(var(--primary))' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorValue)"
              strokeWidth={3}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
