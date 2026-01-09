import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, HelpCircle, Laptop, RotateCw, Server, Trash2 } from 'lucide-react'
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border/50 rounded-xl p-4 shadow-sm relative overflow-hidden group"
    >
      {/* Background Pulse Effect */}
      <div
        className={cn(
          'absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl opacity-10 rounded-bl-full transition-all duration-500',
          isHealthy
            ? 'from-emerald-500 to-transparent'
            : isWarning
              ? 'from-yellow-500 to-transparent'
              : 'from-red-500 to-transparent'
        )}
      />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white dark:bg-card border border-border/20 shadow-sm shrink-0">
            {renderIcon()}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              {node.id}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                {node.platform}
              </span>
            </h3>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Laptop size={10} /> {node.hostname} <span className="opacity-30">|</span> PID:{' '}
              {node.pid}
            </div>
          </div>
        </div>
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]',
            isHealthy
              ? 'bg-emerald-500 text-emerald-500'
              : isWarning
                ? 'bg-yellow-500 text-yellow-500'
                : 'bg-red-500 text-red-500'
          )}
        />
      </div>

      {/* Metrics Grid - Vertical Stack */}
      <div className="space-y-3">
        {/* Laravel Specific Tools (if detected) */}
        {laravel && laravel.workerCount > 0 && (
          <div className="bg-amber-500/5 rounded-lg p-2.5 border border-amber-500/20">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                <PhpIcon className="w-3 h-3" />
                Laravel Workers ({laravel.workerCount})
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
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 transition-all border border-amber-500/10"
              >
                <RotateCw size={10} /> Retry All
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
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 transition-all border border-amber-500/10"
              >
                <RotateCw size={10} /> Restart Workers
              </button>
            </div>
            {laravel.roots?.length > 0 && (
              <div className="mt-2 text-[9px] text-muted-foreground font-mono opacity-60 truncate">
                Root: {laravel.roots[0]}
              </div>
            )}
          </div>
        )}

        {/* Queues Section (if present) */}
        {node.queues && node.queues.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    node.queues.some((q) => q.size.failed > 0)
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-emerald-500'
                  )}
                />
                Queues ({node.queues.length})
              </div>
            </div>
            <div className="space-y-2">
              {node.queues.map((q) => (
                <div key={q.name} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-muted-foreground">{q.name}</span>
                    <div className="flex gap-2 font-mono items-center">
                      {q.size.failed > 0 && (
                        <>
                          <span className="text-red-500 font-bold">{q.size.failed} fail</span>
                          {/* Action Buttons for Failed Jobs */}
                          <div className="flex gap-1 ml-1">
                            <button
                              type="button"
                              onClick={async () => {
                                if (q.driver === 'redis' && node.language === 'php') {
                                  // For PHP + Redis, provide option to use artisan
                                  if (confirm('Use php artisan queue:retry for precision?')) {
                                    await sendCommand(
                                      node.service,
                                      node.id,
                                      'LARAVEL_ACTION',
                                      q.name,
                                      'retry-all'
                                    )
                                    return
                                  }
                                }
                                sendCommand(node.service, node.id, 'RETRY_JOB', q.name)
                              }}
                              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500 transition-colors"
                              title="Retry all failed jobs"
                            >
                              <RotateCw size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                sendCommand(node.service, node.id, 'DELETE_JOB', q.name)
                              }
                              className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Delete all failed jobs"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                      {q.size.active > 0 && (
                        <span className="text-emerald-500">{q.size.active} act</span>
                      )}
                      <span
                        className={cn(
                          q.size.waiting > 100 ? 'text-yellow-500' : 'text-muted-foreground'
                        )}
                      >
                        {q.size.waiting} wait
                      </span>
                    </div>
                  </div>
                  {/* Mini Progress bar for Queue Health (Failed vs Total) */}
                  {q.size.waiting + q.size.active + q.size.failed > 0 && (
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="bg-red-500 h-full transition-all"
                        style={{
                          width: `${(q.size.failed / (q.size.waiting + q.size.active + q.size.failed)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-yellow-500 h-full transition-all"
                        style={{
                          width: `${(q.size.waiting / (q.size.waiting + q.size.active + q.size.failed)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{
                          width: `${(q.size.active / (q.size.waiting + q.size.active + q.size.failed)) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CPU */}
        <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <div className="flex items-center gap-2">
              <Cpu size={12} /> CPU Usage
            </div>
            <span className="text-[10px]">{node.cpu.cores} cores</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{node.cpu.process}%</span>
            <span className="text-xs text-muted-foreground ml-1">proc</span>
          </div>
          {/* Mini Bar */}
          <div className="h-2 w-full bg-muted rounded-full mt-2 overflow-hidden relative">
            {/* Process Usage */}
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 absolute top-0 left-0 z-20 shadow-sm',
                node.cpu.process > 80 ? 'bg-red-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min(node.cpu.process, 100)}%` }}
            />
            {/* System Load Background (Darker) */}
            <div
              className="h-full rounded-full transition-all duration-500 absolute top-0 left-0 bg-muted-foreground/30 z-10"
              style={{ width: `${Math.min(node.cpu.system, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-mono">
            <span className="text-primary font-bold">Proc: {node.cpu.process}%</span>
            <span>Sys: {node.cpu.system}%</span>
          </div>
        </div>

        {/* Memory */}
        <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <div className="flex items-center gap-2">
              <Database size={12} /> RAM Usage
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">
              {formatBytes(node.memory.process.rss)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">RSS</span>
          </div>

          {/* RAM Bar */}
          <div className="h-2 w-full bg-muted rounded-full mt-2 overflow-hidden relative">
            {/* Process Usage */}
            <div
              className="h-full rounded-full transition-all duration-500 absolute top-0 left-0 z-20 shadow-sm bg-indigo-500"
              style={{
                width: `${Math.min((node.memory.process.rss / node.memory.system.total) * 100, 100)}%`,
              }}
            />
            {/* System Usage */}
            <div
              className="h-full rounded-full transition-all duration-500 absolute top-0 left-0 bg-muted-foreground/30 z-10"
              style={{
                width: `${Math.min((node.memory.system.used / node.memory.system.total) * 100, 100)}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mt-3 border-t border-border/30 pt-2 font-mono">
            <div className="flex flex-col">
              <span className="opacity-70">Heap</span>
              <span className="font-bold">{formatBytes(node.memory.process.heapUsed)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="opacity-70">Sys Free</span>
              <span className="">{formatBytes(node.memory.system.free)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Server size={10} /> {node.runtime.framework}
        </span>
        <span>Ups: {Math.floor(node.runtime.uptime / 60)}m</span>
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
