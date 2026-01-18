import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, Clock, Cpu, Gauge, MemoryStick, RefreshCcw, Server, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../utils'

interface Worker {
  id: string
  status: string
  pid: number
  uptime: number
  metrics?: {
    cpu: number
    cores?: number
    ram: {
      rss: number
      heapUsed: number
      total?: number
    }
  }
  queues?: {
    name: string
    size: {
      waiting: number
      active: number
      failed: number
      delayed: number
    }
  }[]
  meta?: {
    laravel?: {
      workerCount: number
      roots: string[]
    }
  }
}

/**
 * Worker Nodes Dashboard Page.
 *
 * Provides a detailed view of all active and inactive worker nodes in the
 * cluster, including their resource usage, monitored queues, and Laravel
 * worker status.
 *
 * @public
 * @since 3.0.0
 */
export function WorkersPage() {
  const queryClient = useQueryClient()
  const { isPending, error, data } = useQuery<{ workers: Worker[] }>({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await fetch('/api/workers')
      return res.json()
    },
    refetchInterval: 5000,
  })

  // Listen to real-time stats updates from SSE
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.workers) {
        // Optimistically update the query cache with fresh worker data from SSE
        queryClient.setQueryData(['workers'], { workers: e.detail.workers })
      }
    }
    window.addEventListener('flux-stats-update', handler)
    return () => window.removeEventListener('flux-stats-update', handler)
  }, [queryClient])

  const workers = data?.workers || []
  const onlineWorkers = workers.filter((w) => w.status === 'online')
  const offlineWorkers = workers.filter((w) => w.status !== 'online')

  const totalCpu = workers.reduce((acc, w) => acc + (w.metrics?.cpu || 0), 0)
  const avgCpu = workers.length > 0 ? totalCpu / workers.length : 0
  const totalRam = workers.reduce((acc, w) => acc + (w.metrics?.ram?.rss || 0), 0)
  const totalCapacity = workers.reduce((acc, w) => acc + (w.metrics?.ram?.total || 0), 0)

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-6">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-xs">
          Loading workers...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-20">
        <div className="bg-red-500/10 text-red-500 p-10 rounded-3xl border border-red-500/20 max-w-md mx-auto shadow-2xl">
          <AlertCircle size={56} className="mx-auto mb-6 opacity-80" />
          <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">
            Failed to Load Workers
          </h3>
          <p className="text-sm font-medium opacity-70">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Worker Nodes</h1>
          <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest">
            Monitor and manage cluster processing nodes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-green-500 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 uppercase tracking-[0.2em]">
          <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
          {onlineWorkers.length} Online
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Server size={16} className="text-green-500" />
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Online Nodes
              </p>
            </div>
            <p className="text-3xl font-black text-green-500">{onlineWorkers.length}</p>
          </div>
        </div>
        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-muted/20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-muted-foreground" />
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Offline Nodes
              </p>
            </div>
            <p className="text-3xl font-black text-muted-foreground">{offlineWorkers.length}</p>
          </div>
        </div>
        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={16} className="text-primary" />
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Avg Load
              </p>
            </div>
            <p className="text-3xl font-black">{avgCpu.toFixed(2)}</p>
          </div>
        </div>
        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <MemoryStick size={16} className="text-indigo-500" />
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
                Cluster RAM
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-indigo-500">{(totalRam / 1024).toFixed(2)}</p>
              {totalCapacity > 0 && (
                <span className="text-sm font-bold text-muted-foreground opacity-50">
                  / {(totalCapacity / 1024).toFixed(0)} GB
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workers.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground/30">
            <Cpu size={48} className="mx-auto mb-4 opacity-20 animate-pulse" />
            <p className="text-sm font-bold uppercase tracking-widest">No worker nodes connected</p>
            <p className="text-xs opacity-60 mt-2">Start a worker to see it appear here</p>
          </div>
        )}
        {workers.map((worker, index) => (
          <motion.div
            key={worker.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-premium p-6 relative overflow-hidden group"
          >
            {/* Status indicator bar */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1.5 transition-all',
                worker.status === 'online' ? 'bg-green-500' : 'bg-muted-foreground/30'
              )}
            />

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
                      worker.status === 'online'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Cpu size={24} />
                  </div>
                  <div
                    className={cn(
                      'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card',
                      worker.status === 'online'
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-muted-foreground'
                    )}
                  />
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-lg group-hover:text-primary transition-colors">
                    {worker.id}
                  </h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    PID: {worker.pid}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
                  worker.status === 'online'
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : 'bg-muted/40 text-muted-foreground border-transparent'
                )}
              >
                {worker.status}
              </span>
            </div>

            {/* Metrics */}
            {worker.metrics && (
              <div className="space-y-4">
                {/* CPU */}
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-muted-foreground">
                      Load (Cap: {worker.metrics.cores || '-'})
                    </span>
                    <span
                      className={cn(
                        worker.metrics.cpu > (worker.metrics.cores || 4)
                          ? 'text-red-500'
                          : worker.metrics.cpu > (worker.metrics.cores || 4) * 0.7
                            ? 'text-amber-500'
                            : 'text-green-500'
                      )}
                    >
                      {worker.metrics.cpu.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (worker.metrics.cpu / (worker.metrics.cores || 1)) * 100)}%`,
                      }}
                      transition={{ duration: 0.5 }}
                      className={cn(
                        'h-full transition-colors',
                        worker.metrics.cpu > (worker.metrics.cores || 4)
                          ? 'bg-red-500'
                          : worker.metrics.cpu > (worker.metrics.cores || 4) * 0.7
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                      )}
                    />
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-muted-foreground">Memory (RSS / Total)</span>
                    <span className="text-indigo-500">
                      {(worker.metrics.ram.rss / 1024).toFixed(2)} GB /{' '}
                      {worker.metrics.ram.total
                        ? (worker.metrics.ram.total / 1024).toFixed(0)
                        : '-'}{' '}
                      GB
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (worker.metrics.ram.rss / (worker.metrics.ram.total || 2048)) * 100)}%`,
                      }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Laravel & Queue Info (New) */}
            <div className="mt-6 space-y-3">
              {/* Monitored Queues */}
              {worker.queues && worker.queues.length > 0 && (
                <div className="bg-muted/10 p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Monitored Queues
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {worker.queues.map((q, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs font-bold text-foreground/80 bg-background/80 px-2 py-1 rounded-md shadow-sm border border-border/50"
                      >
                        <span className="opacity-70">{q.name}</span>
                        {(q.size.waiting > 0 || q.size.failed > 0) && (
                          <span
                            className={cn(
                              'px-1 rounded bg-muted text-[9px]',
                              q.size.failed > 0
                                ? 'text-red-500 bg-red-500/10'
                                : 'text-amber-500 bg-amber-500/10'
                            )}
                          >
                            {q.size.failed > 0
                              ? `${q.size.failed} failed`
                              : `${q.size.waiting} wait`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Laravel Workers Info */}
              {worker.meta?.laravel && (
                <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80">
                      Laravel Workers
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-red-500">
                    {worker.meta.laravel.workerCount || 0}
                  </span>
                </div>
              )}
            </div>

            {/* Uptime */}
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Uptime</span>
              </div>
              <span className="font-mono text-sm font-bold">{formatUptime(worker.uptime)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}
