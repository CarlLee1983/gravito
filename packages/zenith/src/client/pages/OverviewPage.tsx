import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, animate, motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Clock,
  Cpu,
  Hourglass,
  ListTree,
  Search,
  Terminal,
} from 'lucide-react'
import React from 'react'
import { JobInspector } from '../components/JobInspector'
import { LogArchiveModal } from '../components/LogArchiveModal'
import { ThroughputChart } from '../ThroughputChart'
import { cn } from '../utils'
import { WorkerStatus } from '../WorkerStatus'

interface QueueStats {
  name: string
  waiting: number
  delayed: number
  active: number
  failed: number
}

interface SystemLog {
  timestamp: string
  level: 'error' | 'warn' | 'success' | 'info'
  workerId: string
  queue?: string
  message: string
}

interface FluxStats {
  queues: QueueStats[]
  workers: any[]
}

const DEFAULT_STATS: FluxStats = {
  queues: [],
  workers: [],
}

function LiveLogs({
  logs,
  onSearchArchive,
  onWorkerHover,
}: {
  logs: SystemLog[]
  onSearchArchive: () => void
  onWorkerHover?: (id: string | null) => void
}) {
  const scrollRef = React.useRef<HTMLUListElement>(null)

  React.useEffect(() => {
    // Access logs to satisfy dependency check (and trigger on update)
    if (scrollRef.current && logs) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="absolute inset-0 card-premium flex flex-col overflow-hidden group">
      <div className="p-4 border-b bg-muted/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest opacity-70">
            Operational Logs
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSearchArchive}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted rounded-md text-[10px] font-black uppercase tracking-tighter text-muted-foreground transition-all"
          >
            <Search size={12} />
            Search Archive
          </button>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/40"></div>
          </div>
        </div>
      </div>
      <ul
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-[11px] space-y-2.5 scrollbar-thin scroll-smooth"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2 opacity-50">
            <Activity size={24} className="animate-pulse" />
            <p className="font-bold uppercase tracking-widest text-[9px]">Awaiting signals...</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <li
              key={i}
              onMouseEnter={() => onWorkerHover?.(log.workerId)}
              onMouseLeave={() => onWorkerHover?.(null)}
              className="group flex gap-3 hover:bg-primary/[0.02] -mx-2 px-2 py-0.5 rounded transition-all animate-in fade-in slide-in-from-left-2 duration-300 cursor-default"
            >
              <span className="text-muted-foreground/40 shrink-0 tabular-nums select-none opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-tighter',
                      log.level === 'error'
                        ? 'text-red-500'
                        : log.level === 'warn'
                          ? 'text-amber-500'
                          : log.level === 'success'
                            ? 'text-green-500'
                            : 'text-blue-500'
                    )}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase opacity-0 group-hover:opacity-100 transition-all">
                    {log.workerId}
                  </span>
                </div>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
                  {log.message}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function QueueHeatmap({ queues }: { queues: any[] }) {
  return (
    <div className="card-premium p-6 mb-8 overflow-hidden relative group">
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity scanline pointer-events-none"></div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
            Pipeline Load Distribution
          </h3>
        </div>
        <div className="flex gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((o) => (
            <div key={o} className="w-2 h-2 rounded-sm bg-primary" style={{ opacity: o }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5">
        {queues.map((q, i) => {
          const load = Math.min(1, q.waiting / 200)
          return (
            <div
              key={i}
              className="aspect-square rounded-sm transition-all duration-500 hover:scale-125 cursor-help group/tile relative"
              style={{
                backgroundColor: `hsl(var(--primary) / ${0.1 + load * 0.9})`,
                boxShadow: load > 0.7 ? `0 0 10px hsl(var(--primary) / ${load})` : 'none',
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover text-popover-foreground rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover/tile:opacity-100 transition-opacity pointer-events-none border border-border z-50">
                <span className="font-black">{q.name}</span>: {q.waiting} items
              </div>
            </div>
          )
        })}
        {Array.from({ length: Math.max(0, 40 - queues.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-sm bg-muted/20 border border-border/5 group-hover:border-border/10 transition-colors"
          />
        ))}
      </div>
    </div>
  )
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = React.useState(value)

  React.useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (latest: number) => setDisplayValue(Math.round(latest)),
    })
    return () => controls.stop()
  }, [value, displayValue])

  return <span>{displayValue.toLocaleString()}</span>
}

interface MetricCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  trend?: string
  data?: number[]
}

function MetricCard({ title, value, icon, color, trend, data }: MetricCardProps) {
  const displayData = data && data.length > 0 ? data : [20, 30, 25, 40, 35, 50, 45, 60, 55, 70]
  const max = Math.max(...displayData, 10)

  return (
    <div className="card-premium p-8 hover:shadow-2xl transform hover:-translate-y-2 group relative overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none scanline z-0"></div>

      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div
          className={cn(
            'p-4 rounded-2xl bg-muted/30 transition-all group-hover:bg-primary/20 group-hover:text-primary group-hover:rotate-12 duration-500 border border-transparent group-hover:border-primary/20 shadow-inner',
            color
          )}
        >
          {icon}
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
              {trend}
            </span>
            <div className="w-8 h-1 bg-muted/50 rounded-full mt-1 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                className={cn('h-full', color.replace('text-', 'bg-'))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="z-10 relative">
        <p className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-2">
          {title}
        </p>
        <div className="text-4xl font-black tracking-tighter flex items-center gap-1">
          <AnimatedNumber value={value} />
          {title === 'Waiting Jobs' && value > 100 && (
            <span className="text-red-500 animate-pulse text-xs">!</span>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-end gap-1.5 h-16 opacity-5 group-hover:opacity-20 transition-all duration-700 absolute bottom-0 left-0 right-0 p-1.5 pointer-events-none">
        {displayData.map((v, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-t-lg transition-all duration-1000',
              color.replace('text-', 'bg-')
            )}
            style={{
              height: `${(v / max) * 100}%`,
              opacity: 0.1 + (i / displayData.length) * 0.9,
              transitionDelay: `${i * 30}ms`,
            }}
          ></div>
        ))}
      </div>
    </div>
  )
}

function QueueList({
  queues,
  setSelectedQueue,
}: {
  queues: QueueStats[]
  setSelectedQueue: (name: string | null) => void
}) {
  return (
    <div className="card-premium h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-muted/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ListTree size={14} className="text-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest opacity-70">
            Processing Pipelines
          </h2>
        </div>
        <button
          type="button"
          className="text-[10px] font-black text-primary hover:underline flex items-center gap-2 uppercase tracking-widest transition-opacity"
        >
          Stats <ChevronRight size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-left">
          <thead className="bg-muted/10 text-muted-foreground uppercase text-[9px] font-black tracking-widest sticky top-0">
            <tr>
              <th className="px-4 py-3">Queue</th>
              <th className="px-4 py-3">Waiting</th>
              <th className="px-4 py-3 text-right">Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-xs">
            {queues.map((queue) => (
              <tr key={queue.name} className="hover:bg-muted/5 transition-colors group">
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-black text-foreground">{queue.name}</span>
                    {queue.failed > 0 && (
                      <span className="text-[9px] text-red-500 font-bold uppercase">
                        {queue.failed} FAILED
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 font-mono font-black">{queue.waiting.toLocaleString()}</td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedQueue(queue.name)}
                      className="p-1.5 bg-muted hover:bg-primary/20 hover:text-primary rounded text-muted-foreground transition-all active:scale-90"
                      title="Inspect"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function OverviewPage() {
  const [selectedQueue, setSelectedQueue] = React.useState<string | null>(null)
  const [hoveredWorkerId, setHoveredWorkerId] = React.useState<string | null>(null)

  const [logs, setLogs] = React.useState<SystemLog[]>([])
  const [stats, setStats] = React.useState<FluxStats>(DEFAULT_STATS)
  const [isLogArchiveOpen, setIsLogArchiveOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = (e: any) => setSelectedQueue(e.detail)
    window.addEventListener('select-queue', handler)
    return () => window.removeEventListener('select-queue', handler)
  }, [])

  // Initial fetch
  React.useEffect(() => {
    fetch('/api/queues')
      .then((res) => res.json())
      .then((data) => {
        if (data.queues) {
          setStats((prev) => ({ ...prev, queues: data.queues }))
        }
      })
    fetch('/api/workers')
      .then((res) => res.json())
      .then((data) => {
        if (data.workers) {
          setStats((prev) => ({ ...prev, workers: data.workers }))
        }
      })
  }, [])

  // Stats update listener
  React.useEffect(() => {
    const handler = (e: any) => {
      const newStats = e.detail
      if (newStats) {
        setStats((prev) => ({
          queues: newStats.queues || prev.queues,
          workers: newStats.workers || prev.workers,
        }))
      }
    }
    window.addEventListener('flux-stats-update', handler)
    return () => window.removeEventListener('flux-stats-update', handler)
  }, [])

  // Live log listener
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const data = e.detail
      setLogs((prev) => [...prev.slice(-99), data])
    }
    window.addEventListener('flux-log-update', handler as EventListener)
    return () => window.removeEventListener('flux-log-update', handler as EventListener)
  }, [])

  // Clear logs listener
  React.useEffect(() => {
    const handler = () => setLogs([])
    window.addEventListener('clear-logs', handler)
    return () => window.removeEventListener('clear-logs', handler)
  }, [])

  const { data: historyData } = useQuery<{ history: Record<string, number[]> }>({
    queryKey: ['metrics-history'],
    queryFn: () => fetch('/api/metrics/history').then((res) => res.json()),
    refetchInterval: 30000,
  })

  const history = historyData?.history || {}
  const { queues, workers } = stats

  const totalWaiting = queues.reduce((acc, q) => acc + q.waiting, 0)
  const totalDelayed = queues.reduce((acc, q) => acc + q.delayed, 0)
  const totalFailed = queues.reduce((acc, q) => acc + q.failed, 0)
  const activeWorkers = workers.length

  return (
    <div className="space-y-12">
      <LogArchiveModal isOpen={isLogArchiveOpen} onClose={() => setIsLogArchiveOpen(false)} />
      <AnimatePresence>
        {selectedQueue && (
          <JobInspector queueName={selectedQueue} onClose={() => setSelectedQueue(null)} />
        )}
      </AnimatePresence>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">System Overview</h1>
          <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest">
            Real-time status of your processing pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-green-500 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 uppercase tracking-[0.2em] animate-pulse">
          <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          Live Syncing
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Waiting Jobs"
          value={totalWaiting}
          icon={<Hourglass size={20} />}
          color="text-amber-500"
          trend="+12% / hr"
          data={history.waiting}
        />
        <MetricCard
          title="Delayed Jobs"
          value={totalDelayed}
          icon={<Clock size={20} />}
          color="text-blue-500"
          trend="Stable"
          data={history.delayed}
        />
        <MetricCard
          title="Failed Jobs"
          value={totalFailed}
          icon={<AlertCircle size={20} />}
          color="text-red-500"
          trend={totalFailed > 0 ? 'CRITICAL' : 'CLEAN'}
          data={history.failed}
        />
        <MetricCard
          title="Active Workers"
          value={activeWorkers}
          icon={<Cpu size={20} />}
          color="text-indigo-500"
          trend={activeWorkers > 0 ? 'ONLINE' : 'IDLE'}
          data={history.workers}
        />
      </div>

      <ThroughputChart />

      <QueueHeatmap queues={queues} />

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 lg:h-[600px]">
        <div className="lg:col-span-1 h-[400px] lg:h-full">
          <WorkerStatus highlightedWorkerId={hoveredWorkerId} workers={workers} />
        </div>
        <div className="lg:col-span-2 flex flex-col lg:grid lg:grid-rows-2 gap-6 lg:h-full">
          <div className="relative h-[300px] lg:h-full min-h-0 overflow-hidden bg-card rounded-xl border border-border/50">
            <LiveLogs
              logs={logs}
              onSearchArchive={() => setIsLogArchiveOpen(true)}
              onWorkerHover={setHoveredWorkerId}
            />
          </div>
          <div className="h-[300px] lg:h-full min-h-0 overflow-hidden bg-card rounded-xl border border-border/50">
            <QueueList queues={queues} setSelectedQueue={setSelectedQueue} />
          </div>
        </div>
      </div>
    </div>
  )
}
