import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, HelpCircle, Laptop, RotateCw, Server } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PulseNode } from '../../shared/types'
import { BunIcon, DenoIcon, GoIcon, NodeIcon, PhpIcon, PythonIcon } from '../components/BrandIcons'
import { PageHeader } from '../components/PageHeader'
import { cn } from '../utils'

// Helper to format bytes
const formatBytes = (bytes: number) => {
  if (bytes === 0) {
    return '0 B'
  }
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// Helper to send remote commands to Quasar agents
const sendCommand = async (
  service: string,
  nodeId: string,
  type: 'RETRY_JOB' | 'DELETE_JOB' | 'LARAVEL_ACTION',
  queue: string,
  action?: string
) => {
  try {
    const response = await fetch('/api/pulse/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service,
        nodeId,
        type,
        queue,
        action,
        // For now, we send a wildcard jobKey to indicate "all failed jobs"
        // The agent will interpret this appropriately
        jobKey: '*',
        driver: 'redis', // Default to redis, could be detected from queue config
      }),
    })

    const result = await response.json()
    if (result.success) {
      console.log(`[Pulse] ${type} command sent:`, result.message)
    } else {
      console.error(`[Pulse] Command failed:`, result.error)
    }
  } catch (err) {
    console.error('[Pulse] Failed to send command:', err)
  }
}

function NodeCard({ node }: { node: PulseNode }) {
  const isHealthy = Date.now() - node.timestamp < 30000 // 30s threshold
  const isWarning = !isHealthy && Date.now() - node.timestamp < 60000 // 60s warning

  const renderIcon = () => {
    switch (node.language) {
      case 'node':
        return <NodeIcon className="w-6 h-6" />
      case 'bun':
        return <BunIcon className="w-6 h-6 text-black" />
      case 'deno':
        return <DenoIcon className="w-6 h-6" />
      case 'php':
        return <PhpIcon className="w-6 h-6" />
      case 'go':
        return <GoIcon className="w-6 h-6" />
      case 'python':
        return <PythonIcon className="w-6 h-6" />
      default:
        return <HelpCircle className="w-6 h-6 text-white" />
    }
  }

  const laravel = node.meta?.laravel

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card-premium p-5 relative overflow-hidden group border-l-4"
      style={{
        borderLeftColor: isHealthy ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444',
      }}
    >
      {/* Background Pulse Effect */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl opacity-5 rounded-bl-full transition-all duration-700',
          isHealthy
            ? 'from-emerald-500 to-transparent'
            : isWarning
              ? 'from-yellow-500 to-transparent'
              : 'from-red-500 to-transparent'
        )}
      />

      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-800/50 border border-white/10 shadow-xl shrink-0">
            {renderIcon()}
          </div>
          <div>
            <h3 className="font-black text-foreground text-base flex items-center gap-2 font-heading tracking-tight">
              {node.id}
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase font-mono border border-primary/20">
                {node.platform}
              </span>
            </h3>
            <div className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 mt-1 uppercase tracking-wider opacity-60">
              <Laptop size={12} className="opacity-40" /> {node.hostname}{' '}
              <span className="opacity-20">/</span> PID:{' '}
              <span className="font-mono">{node.pid}</span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'w-3 h-3 rounded-full glow-pulse',
            isHealthy
              ? 'bg-emerald-500 text-emerald-500'
              : isWarning
                ? 'bg-yellow-500 text-yellow-500'
                : 'bg-red-500 text-red-500'
          )}
        />
      </div>

      {/* Metrics Grid - Vertical Stack */}
      <div className="space-y-4 font-mono">
        {/* Laravel Specific Tools (if detected) */}
        {laravel && laravel.workerCount > 0 && (
          <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
            <div className="flex items-center justify-between text-[10px] mb-3">
              <div className="flex items-center gap-2 font-black text-amber-500 uppercase tracking-widest">
                <PhpIcon className="w-4 h-4" />
                Laravel Ecosystem ({laravel.workerCount})
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm('Are you sure you want to retry ALL failed Laravel jobs on this host?')
                  ) {
                    sendCommand(node.service, node.id, 'LARAVEL_ACTION', 'default', 'retry-all')
                  }
                }}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all border border-amber-500/20"
              >
                <RotateCw size={12} /> Retry All
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      'Artisan queue:restart will signal all workers to quit. Supervisor will restart them. Proceed?'
                    )
                  ) {
                    sendCommand(node.service, node.id, 'LARAVEL_ACTION', 'default', 'restart')
                  }
                }}
                className="bg-white/5 hover:bg-white/10 text-foreground/80 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all border border-white/5"
              >
                <RotateCw size={12} /> Restart
              </button>
            </div>
          </div>
        )}

        {/* Queues Section (if present) */}
        {node.queues && node.queues.length > 0 && (
          <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
              <div className="flex items-center gap-2">
                <Database size={12} />
                Monitored Pipelines
              </div>
              <span className="bg-white/5 px-1.5 rounded">{node.queues.length} ACTIVE</span>
            </div>
            <div className="space-y-3">
              {node.queues.map((q) => (
                <div key={q.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-foreground/80 tracking-tighter">{q.name}</span>
                    <div className="flex gap-3 items-center">
                      {q.size.failed > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-red-500 font-black">{q.size.failed} FAIL</span>
                          <button
                            type="button"
                            onClick={() => sendCommand(node.service, node.id, 'RETRY_JOB', q.name)}
                            className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <RotateCw size={10} />
                          </button>
                        </div>
                      )}
                      <span className="text-muted-foreground/60">{q.size.waiting} WAIT</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{
                        width: `${(q.size.failed / Math.max(1, q.size.waiting + q.size.active + q.size.failed)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all shadow-[0_0_10px_#10B981]"
                      style={{
                        width: `${(q.size.active / Math.max(1, q.size.waiting + q.size.active + q.size.failed)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Load */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[9px] font-black uppercase text-muted-foreground/40 mb-2">
              <span className="flex items-center gap-1.5">
                <Cpu size={10} /> CPU
              </span>
              <span>{node.cpu.cores}C</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-primary tracking-tighter">
                {node.cpu.process.toFixed(0)}%
              </span>
              <span className="text-[10px] font-bold opacity-40 uppercase">Load</span>
            </div>
            <div className="h-1 w-full bg-black/40 rounded-full mt-3 overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-1000',
                  node.cpu.process > 80
                    ? 'bg-red-500 shadow-[0_0_10px_#EF4444]'
                    : 'bg-primary shadow-[0_0_10px_#00F0FF]'
                )}
                style={{ width: `${node.cpu.process}%` }}
              />
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[9px] font-black uppercase text-muted-foreground/40 mb-2">
              <span className="flex items-center gap-1.5">
                <Database size={10} /> RAM
              </span>
              <span>RSS</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">
                {formatBytes(node.memory.process.rss).split(' ')[0]}
              </span>
              <span className="text-[10px] font-bold opacity-40 uppercase">
                {formatBytes(node.memory.process.rss).split(' ')[1]}
              </span>
            </div>
            <div className="h-1 w-full bg-black/40 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_#6366F1]"
                style={{ width: `${(node.memory.process.rss / node.memory.system.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
        <span className="flex items-center gap-2">
          <Server size={12} className="text-primary/40" />
          {node.runtime.framework} <span className="opacity-20">•</span> v{node.version}
        </span>
        <span className="font-mono tabular-nums">UP: {Math.floor(node.runtime.uptime / 60)}M</span>
      </div>
    </motion.div>
  )
}

// Compact Service Group Component
function ServiceGroup({ service, nodes }: { service: string; nodes: PulseNode[] }) {
  const isSingle = nodes.length === 1

  return (
    <div className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex-1">
          {service}
        </h2>
        <span className="bg-muted text-foreground px-2 py-0.5 rounded-md text-xs font-mono">
          {nodes.length}
        </span>
      </div>

      <div className={cn('grid gap-3', isSingle ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2')}>
        {nodes.map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  )
}

export function PulsePage() {
  const { data: initialData, isLoading } = useQuery<{ nodes: Record<string, PulseNode[]> }>({
    queryKey: ['pulse-nodes'],
    queryFn: async () => {
      const res = await fetch('/api/pulse/nodes')
      return res.json()
    },
    // Remove polling
  })

  const [nodes, setNodes] = useState<Record<string, PulseNode[]>>({})

  // Hydrate initial data
  useEffect(() => {
    if (initialData?.nodes) {
      setNodes(initialData.nodes)
    }
  }, [initialData])

  // Listen for SSE updates
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.nodes) {
        setNodes(customEvent.detail.nodes)
      }
    }
    window.addEventListener('flux-pulse-update', handler)
    return () => window.removeEventListener('flux-pulse-update', handler)
  }, [])

  // Loading Skeleton
  if (isLoading && Object.keys(nodes).length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const services = Object.entries(nodes).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <PageHeader
          icon={Activity}
          title="System Pulse"
          description="Real-time infrastructure monitoring across your entire stack."
        >
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE CONNECTION
          </div>
        </PageHeader>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Activity className="text-muted-foreground" size={32} />
            </div>
            <h3 className="text-lg font-bold">No Pulse Signals Detected</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Start a worker with the pulse agent enabled or check your Redis connection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {services.map(([service, nodes]) => (
              <ServiceGroup key={service} service={service} nodes={nodes} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
