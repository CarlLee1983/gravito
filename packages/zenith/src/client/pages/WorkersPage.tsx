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
        <div className="card-premium p-5 relative overflow-hidden group border-l-4 border-emerald-500">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Server size={14} className="text-emerald-500" />
              <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] font-heading">
                Operational Nodes
              </p>
            </div>
            <p className="text-3xl font-black text-white font-mono tracking-tighter">
              {onlineWorkers.length}
            </p>
          </div>
        </div>
        <div className="card-premium p-5 relative overflow-hidden group border-l-4 border-white/10">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-white/20" />
              <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] font-heading">
                Standby Nodes
              </p>
            </div>
            <p className="text-3xl font-black text-white/40 font-mono tracking-tighter">
              {offlineWorkers.length}
            </p>
          </div>
        </div>
        <div className="card-premium p-5 relative overflow-hidden group border-l-4 border-primary/40">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Gauge size={14} className="text-primary" />
              <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] font-heading">
                Compute Load
              </p>
            </div>
            <p className="text-3xl font-black text-white font-mono tracking-tighter">
              {avgCpu.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="card-premium p-5 relative overflow-hidden group border-l-4 border-indigo-500/40">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <MemoryStick size={14} className="text-indigo-400" />
              <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] font-heading">
                Cluster Memory
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-white font-mono tracking-tighter">
                {(totalRam / 1024).toFixed(1)}
              </p>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                GB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {workers.length === 0 && (
          <div className="col-span-full py-32 text-center text-muted-foreground/20">
            <Cpu size={48} className="mx-auto mb-4 opacity-30 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">
              Awaiting signal from constellation...
            </p>
          </div>
        )}
        {workers.map((worker, index) => (
          <motion.div
            key={worker.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="card-premium p-6 relative overflow-hidden group border-l-4"
            style={{ borderLeftColor: worker.status === 'online' ? '#10B981' : '#27272A' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-all border border-white/5',
                      worker.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-zinc-800 text-muted-foreground/40'
                    )}
                  >
                    <Cpu size={24} />
                  </div>
                  {worker.status === 'online' && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-zinc-950 bg-emerald-500 animate-pulse shadow-[0_0_10px_#10B981]" />
                  )}
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-base group-hover:text-primary transition-colors font-heading uppercase italic">
                    {worker.id}
                  </h3>
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] font-mono mt-1">
                    PID: {worker.pid}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all',
                  worker.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'bg-zinc-800/50 text-muted-foreground/40 border-transparent'
                )}
              >
                {worker.status}
              </span>
            </div>

            {/* Metrics */}
            {worker.metrics && (
              <div className="space-y-5 font-mono">
                {/* CPU */}
                <div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2.5">
                    <span className="text-muted-foreground/60">CPU Compute Power</span>
                    <span
                      className={cn(
                        worker.metrics.cpu > (worker.metrics.cores || 4)
                          ? 'text-red-500'
                          : worker.metrics.cpu > (worker.metrics.cores || 4) * 0.7
                            ? 'text-amber-500 font-black'
                            : 'text-primary font-black'
                      )}
                    >
                      {worker.metrics.cpu.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (worker.metrics.cpu / (worker.metrics.cores || 1)) * 100)}%`,
                      }}
                      transition={{ duration: 1 }}
                      className={cn(
                        'h-full transition-colors relative',
                        worker.metrics.cpu > (worker.metrics.cores || 4)
                          ? 'bg-red-500'
                          : worker.metrics.cpu > (worker.metrics.cores || 4) * 0.7
                            ? 'bg-amber-500'
                            : 'bg-primary shadow-[0_0_10px_#00F0FF]'
                      )}
                    />
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2.5">
                    <span className="text-muted-foreground/60">Memory Integrity</span>
                    <span className="text-white/80 font-black">
                      {(worker.metrics.ram.rss / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (worker.metrics.ram.rss / (worker.metrics.ram.total || 2048)) * 100)}%`,
                      }}
                      transition={{ duration: 1 }}
                      className="h-full bg-indigo-500 shadow-[0_0_10px_#6366F1]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Laravel & Queue Info (New) */}
            <div className="mt-8 space-y-3">
              {/* Monitored Queues */}
              {worker.queues && worker.queues.length > 0 && (
                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#00F0FF]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 font-heading">
                      Pipeline Access
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {worker.queues.map((q, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[10px] font-black text-foreground/60 bg-black/40 px-2 py-1 rounded border border-white/5 font-mono"
                      >
                        <span className="opacity-40">{q.name}</span>
                        {(q.size.waiting > 0 || q.size.failed > 0) && (
                          <span
                            className={cn(
                              'px-1 rounded text-[8px] border',
                              q.size.failed > 0
                                ? 'text-red-500 bg-red-500/10 border-red-500/20'
                                : 'text-primary bg-primary/10 border-primary/20'
                            )}
                          >
                            {q.size.failed > 0 ? `! FAIL` : `${q.size.waiting}W`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Laravel Workers Info */}
              {worker.meta?.laravel && (
                <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#EF4444]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/80 font-heading">
                      Laravel Threading
                    </span>
                  </div>
                  <span className="font-mono text-sm font-black text-red-500 tabular-nums tracking-tighter">
                    {worker.meta.laravel.workerCount || 0} PHP
                  </span>
                </div>
              )}
            </div>

            {/* Uptime */}
            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground/40 font-heading">
                <Clock size={12} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                  Quantum Uptime
                </span>
              </div>
              <span className="font-mono text-[11px] font-black text-white/60 tabular-nums">
                {formatUptime(worker.uptime)}
              </span>
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
