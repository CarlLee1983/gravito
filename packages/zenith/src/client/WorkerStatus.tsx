import { type ClassValue, clsx } from 'clsx'
import { Activity, Cpu, Terminal } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

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
  status: 'online' | 'offline'
  pid: number
  uptime: number
  metrics?: {
    cpu: number
    cores: number
    ram: {
      rss: number
    }
  }
  meta?: {
    laravel?: {
      workerCount: number
      roots: string[]
    }
  }
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
      <div className="p-6 pb-0 flex-none">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2 tracking-tight">
              <Cpu size={20} className="text-primary" />
              Cluster Nodes
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
              Real-time load
            </p>
          </div>
          <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/20">
            {onlineCount} ACTIVE
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 space-y-3 scrollbar-thin pb-6">
        {workers.length === 0 && (
          <div className="py-12 text-center text-muted-foreground/30 flex flex-col items-center gap-2">
            <Activity size={24} className="opacity-20 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest">No nodes connected</p>
          </div>
        )}

        {workers.map((worker) => (
          <div
            key={worker.id}
            className={cn(
              'relative flex items-center gap-4 p-4 rounded-2xl border transition-all group overflow-hidden shrink-0',
              worker.id === highlightedWorkerId
                ? 'bg-primary/5 border-primary/50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] -translate-y-1 scale-[1.02] z-10'
                : 'bg-card hover:bg-muted/10 border-border/50 hover:border-primary/20'
            )}
          >
            {/* Status bar */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1 transition-all',
                worker.status === 'online' ? 'bg-green-500' : 'bg-muted-foreground/30'
              )}
            />

            {/* Icon/Dot */}
            <div className="relative shrink-0 ml-1">
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  worker.status === 'online'
                    ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                    : 'bg-muted-foreground/40'
                )}
              />
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center mr-2">
              {worker.service && (
                <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest mb-0.5 whitespace-nowrap">
                  {worker.service}
                </span>
              )}
              <h4
                className="text-sm font-black tracking-tight text-foreground truncate"
                title={worker.id}
              >
                {getWorkerName(worker.id, worker.pid) || worker.id}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  PID {worker.pid}
                </span>
                {worker.meta?.laravel && worker.meta.laravel.workerCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm uppercase tracking-widest leading-none whitespace-nowrap">
                    <Terminal size={8} />
                    {worker.meta.laravel.workerCount} PHP
                  </span>
                )}
              </div>
            </div>

            {/* Metrics (Right Side) */}
            <div className="flex items-center gap-3 text-right shrink-0">
              {worker.metrics && (
                <>
                  <div className="hidden sm:block space-y-1 w-12">
                    <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                      <span>CPU</span>
                      <span
                        className={cn(
                          worker.metrics.cpu > (worker.metrics.cores || 1) * 100 && 'text-red-500'
                        )}
                      >
                        {worker.metrics.cpu.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-700"
                        style={{ width: `${Math.min(100, worker.metrics.cpu)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="hidden sm:block space-y-1 w-12">
                    <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                      <span>RAM</span>
                      <span className="truncate ml-1">
                        {formatBytes(worker.metrics.ram.rss).split(' ')[0]}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (worker.metrics.ram.rss / 2000000000) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}

              <div className="w-12">
                <p className="text-xs font-black tracking-tighter tabular-nums text-foreground">
                  {worker.uptime > 3600
                    ? `${(worker.uptime / 3600).toFixed(1)}h`
                    : worker.uptime > 60
                      ? `${(worker.uptime / 60).toFixed(0)}m`
                      : `${worker.uptime.toFixed(0)}s`}
                </p>
                <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-50">
                  UP
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 pt-0 flex-none">
        <button
          type="button"
          className="w-full py-3 bg-muted text-[10px] font-black rounded-xl hover:bg-primary hover:text-primary-foreground transition-all uppercase tracking-[0.2em] opacity-60 hover:opacity-100 active:scale-95 shadow-lg shadow-transparent hover:shadow-primary/20"
        >
          Manage Nodes
        </button>
      </div>
    </div>
  )
}
