import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Filter,
  ListTree,
  Pause,
  Play,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react'
import React from 'react'
import { JobInspector } from '../components/JobInspector'
import { cn } from '../utils'

interface QueueStats {
  name: string
  waiting: number
  delayed: number
  active: number
  failed: number
  paused?: boolean
}

/**
 * Queue Management Page.
 *
 * Provides detailed monitoring and management controls for message queues,
 * including job inspection, pausing/resuming queues, and bulk retry/purge actions.
 *
 * @public
 * @since 3.0.0
 */
export function QueuesPage() {
  const [selectedQueue, setSelectedQueue] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'idle' | 'critical'>(
    'all'
  )
  const queryClient = useQueryClient()

  const { isPending, error, data } = useQuery<{ queues: QueueStats[] }>({
    queryKey: ['queues'],
    queryFn: () => fetch('/api/queues').then((res) => res.json()),
    staleTime: Infinity, // No auto refetch
  })

  // Listen for real-time updates from Layout's global stream
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.queues) {
        queryClient.setQueryData(['queues'], { queues: e.detail.queues })
      }
    }
    window.addEventListener('flux-stats-update', handler as EventListener)
    return () => window.removeEventListener('flux-stats-update', handler as EventListener)
  }, [queryClient])

  // Note: We intentionally do NOT scroll to top when JobInspector opens
  // This allows users to quickly inspect multiple queues without losing their scroll position

  const queues = data?.queues || []

  const filteredQueues = queues.filter((q) => {
    const matchesSearch = q.name.toLowerCase().includes(searchQuery.toLowerCase())
    const status = q.failed > 0 ? 'critical' : q.active > 0 ? 'active' : 'idle'
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalWaiting = queues.reduce((acc, q) => acc + q.waiting, 0)
  const totalDelayed = queues.reduce((acc, q) => acc + q.delayed, 0)
  const totalFailed = queues.reduce((acc, q) => acc + q.failed, 0)
  const totalActive = queues.reduce((acc, q) => acc + q.active, 0)

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-6">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-xs">
          Loading queues...
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
            Failed to Load Queues
          </h3>
          <p className="text-sm font-medium opacity-70 mb-8">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* JobInspector as full-screen modal overlay */}
      <AnimatePresence>
        {selectedQueue && (
          <JobInspector queueName={selectedQueue} onClose={() => setSelectedQueue(null)} />
        )}
      </AnimatePresence>

      {/* Main page content */}
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Processing Queues</h1>
            <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest">
              Manage and monitor all processing pipelines.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-green-500 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 uppercase tracking-[0.2em] animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            {queues.length} Queues
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-premium p-5 flex flex-col justify-between">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 font-heading">
              Total Waiting
            </p>
            <p className="text-3xl font-black font-mono tracking-tighter">
              {totalWaiting.toLocaleString()}
            </p>
          </div>
          <div className="card-premium p-5 flex flex-col justify-between">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 font-heading">
              Total Delayed
            </p>
            <p className="text-3xl font-black text-amber-500 font-mono tracking-tighter">
              {totalDelayed.toLocaleString()}
            </p>
          </div>
          <div className="card-premium p-5 flex flex-col justify-between">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 font-heading">
              Total Failed
            </p>
            <p className="text-3xl font-black text-red-500 font-mono tracking-tighter">
              {totalFailed.toLocaleString()}
            </p>
          </div>
          <div className="card-premium p-5 flex flex-col justify-between">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 font-heading">
              Currently Active
            </p>
            <p className="text-3xl font-black text-emerald-500 font-mono tracking-tighter">
              {totalActive.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-premium p-3 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
              size={16}
            />
            <input
              type="text"
              aria-label="Filter pipelines"
              placeholder="Filter pipelines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-xs font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground/40" />
            {(['all', 'active', 'idle', 'critical'] as const).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border',
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/60'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Queue List */}
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/20 text-muted-foreground/60 uppercase text-[9px] font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Pipeline Architecture</th>
                  <th className="px-6 py-4 text-center">Waiting</th>
                  <th className="px-6 py-4 text-center">Delayed</th>
                  <th className="px-6 py-4 text-center">Active</th>
                  <th className="px-6 py-4 text-center">Failed</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-mono">
                {filteredQueues.map((queue) => {
                  const status =
                    queue.failed > 0 ? 'critical' : queue.active > 0 ? 'active' : 'idle'
                  return (
                    <tr key={queue.name} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800/50 border border-white/5 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all">
                            <ListTree size={18} />
                          </div>
                          <span className="font-black tracking-tight text-sm font-heading">
                            {queue.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-foreground/80">
                        {queue.waiting.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-amber-500/80">{queue.delayed}</td>
                      <td className="px-6 py-4 text-center text-emerald-500/80">{queue.active}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'font-black',
                            queue.failed > 0 ? 'text-red-500' : 'text-muted-foreground/20'
                          )}
                        >
                          {queue.failed}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all',
                            queue.paused
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : status === 'critical'
                                ? 'bg-red-500 text-white border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse'
                                : status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                  : 'bg-zinc-800/50 text-muted-foreground/40 border-transparent'
                          )}
                        >
                          {queue.paused ? 'paused' : status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          {/* Pause/Resume button */}
                          <button
                            type="button"
                            onClick={async () => {
                              const action = queue.paused ? 'resume' : 'pause'
                              await fetch(`/api/queues/${queue.name}/${action}`, { method: 'POST' })
                              queryClient.invalidateQueries({ queryKey: ['queues'] })
                            }}
                            className={cn(
                              'p-2 rounded-lg transition-all border border-transparent hover:border-white/10',
                              queue.paused
                                ? 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10'
                                : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500'
                            )}
                            title={queue.paused ? 'Resume Queue' : 'Pause Queue'}
                            aria-label={
                              queue.paused ? `Resume ${queue.name}` : `Pause ${queue.name}`
                            }
                          >
                            {queue.paused ? <Play size={14} /> : <Pause size={14} />}
                          </button>

                          <div className="w-px h-4 bg-white/5 mx-1" />

                          {queue.delayed > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                fetch(`/api/queues/${queue.name}/retry-all`, {
                                  method: 'POST',
                                }).then(() =>
                                  queryClient.invalidateQueries({ queryKey: ['queues'] })
                                )
                              }
                              className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                              title="Retry All Delayed"
                              aria-label={`Retry all delayed jobs in ${queue.name}`}
                            >
                              <RefreshCcw size={14} />
                            </button>
                          )}
                          {queue.failed > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  fetch(`/api/queues/${queue.name}/retry-all-failed`, {
                                    method: 'POST',
                                  }).then(() =>
                                    queryClient.invalidateQueries({ queryKey: ['queues'] })
                                  )
                                }
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title="Retry All Failed"
                                aria-label={`Retry all failed jobs in ${queue.name}`}
                              >
                                <RefreshCcw size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Are you sure you want to clear all failed jobs in queue "${queue.name}"?`
                                    )
                                  ) {
                                    fetch(`/api/queues/${queue.name}/clear-failed`, {
                                      method: 'POST',
                                    }).then(() =>
                                      queryClient.invalidateQueries({ queryKey: ['queues'] })
                                    )
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Clear Failed Jobs"
                                aria-label={`Clear all failed jobs in ${queue.name}`}
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedQueue(queue.name)}
                            className="ml-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-foreground/80 rounded-lg transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-primary/40"
                          >
                            Inspect <ArrowRight size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredQueues.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
                      <Activity size={40} className="mx-auto mb-4 opacity-10 animate-pulse" />
                      <p className="text-sm font-bold opacity-30 italic uppercase tracking-widest">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No queues match your filters'
                          : 'No queues available'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
