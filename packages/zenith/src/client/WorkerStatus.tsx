import { type ClassValue, clsx } from 'clsx'
import { Activity, Cpu } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import type { PulseNodeMeta } from '../shared/types'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 B'
  }
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function getWorkerName(id: string, pid: number) {
  // If ID contains Hostname+PID, try to simplify it
  // Example: CarldeMacBook-Air.local-99401
  const complexIdMatch = id.match(/^(.*)-(\d+)$/)
  if (complexIdMatch && parseInt(complexIdMatch[2], 10) === pid) {
    // Return just the hostname part, and maybe truncate if too long
    let hostname = complexIdMatch[1]
    if (hostname.endsWith('.local')) {
      hostname = hostname.replace('.local', '')
    }
    return hostname
  }
  // Fallback
  return id.replace('.local', '')
}

interface WorkerInfo {
  id: string
  service?: string
  status: 'online' | 'offline' | 'idle'
  pid: number
  uptime: number
  metrics?: {
    cpu: number
    cores: number
    ram: {
      rss: number
    }
  }
  meta?: PulseNodeMeta
}

/**
 * Real-time worker node status visualization component.
 *
 * Displays a list of active worker nodes with their CPU, RAM, uptime metrics,
 * and highlights a specific worker if provided.
 *
 * @public
 * @since 3.0.0
 */
export function WorkerStatus({
  highlightedWorkerId,
  workers = [],
}: {
  highlightedWorkerId?: string | null
  workers?: WorkerInfo[]
}) {
  const onlineCount = workers.filter((w) => w.status === 'online').length

  return (
    <div className="card-premium h-full flex flex-col overflow-hidden">
      <div className="p-5 pb-0 flex-none">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-base font-black flex items-center gap-2 tracking-tight font-heading">
              <Cpu size={18} className="text-primary" />
              Cluster Nodes
            </h3>
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] opacity-50 mt-0.5">
              Live Infrastructure
            </p>
          </div>
          <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-widest border border-emerald-500/20">
            {onlineCount} ACTIVE
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-5 space-y-2 scrollbar-thin pb-5">
        {workers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground/20 flex flex-col items-center gap-2">
            <Activity size={24} className="opacity-30 animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Awaiting signals...</p>
          </div>
        )}

        {workers.map((worker) => (
          <div
            key={worker.id}
            className={cn(
              'relative flex items-center gap-3 p-3 rounded-xl border transition-all group overflow-hidden shrink-0',
              worker.id === highlightedWorkerId
                ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(0,240,255,0.1)] -translate-x-1 z-10'
                : 'bg-black/20 hover:bg-white/[0.03] border-white/5 hover:border-primary/20'
            )}
          >
            {/* Status bar */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1 transition-all',
                worker.status === 'online'
                  ? 'bg-emerald-500 shadow-[0_0_10px_#10B981]'
                  : 'bg-muted-foreground/20'
              )}
            />

            {/* Main Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {worker.service && (
                <span className="text-[8px] font-black text-primary uppercase tracking-widest mb-0.5 whitespace-nowrap opacity-80">
                  {worker.service}
                </span>
              )}
              <h4
                className="text-xs font-black tracking-tight text-foreground/90 truncate font-heading"
                title={worker.id}
              >
                {getWorkerName(worker.id, worker.pid) || worker.id}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase font-mono">
                  PID:{worker.pid}
                </span>
                {worker.meta?.laravel && worker.meta.laravel.workerCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-black text-white bg-red-500/80 px-1 rounded shadow-sm uppercase tracking-tighter leading-none whitespace-nowrap">
                    {worker.meta.laravel.workerCount} PHP
                  </span>
                )}
              </div>
            </div>

            {/* Metrics (Right Side) */}
            <div className="flex items-center gap-4 text-right shrink-0">
              {worker.metrics && (
                <>
                  <div className="hidden sm:flex flex-col items-end gap-1 w-10">
                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase font-mono">
                      CPU
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-black font-mono tracking-tighter',
                        worker.metrics.cpu > 80 ? 'text-red-500' : 'text-primary'
                      )}
                    >
                      {worker.metrics.cpu.toFixed(0)}%
                    </span>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1 w-12">
                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase font-mono">
                      RAM
                    </span>
                    <span className="text-[10px] font-black font-mono tracking-tighter text-white/80">
                      {formatBytes(worker.metrics.ram.rss).split(' ')[0]}
                    </span>
                  </div>
                </>
              )}

              <div className="flex flex-col items-end gap-1 w-10">
                <span className="text-[8px] font-black text-muted-foreground/40 uppercase font-mono">
                  UP
                </span>
                <p className="text-[10px] font-black tracking-tighter font-mono text-foreground/60 tabular-nums">
                  {worker.uptime > 3600
                    ? `${(worker.uptime / 3600).toFixed(1)}H`
                    : worker.uptime > 60
                      ? `${(worker.uptime / 60).toFixed(0)}M`
                      : `${worker.uptime.toFixed(0)}S`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 pt-0 flex-none">
        <button
          type="button"
          className="w-full py-2.5 bg-muted/50 text-[9px] font-black rounded-lg hover:bg-primary hover:text-primary-foreground transition-all uppercase tracking-[0.2em] border border-white/5 hover:border-primary/50 active:scale-95 shadow-lg shadow-transparent hover:shadow-primary/10 font-heading"
        >
          Node Orchestration
        </button>
      </div>
    </div>
  )
}
