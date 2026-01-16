import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Clock, RefreshCcw, Search } from 'lucide-react'
import React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils'
import { ConfirmDialog } from './ConfirmDialog'

interface Job {
  id: string
  name?: string
  data?: any
  status?: string
  timestamp?: number
  scheduledAt?: string
  error?: string
  failedAt?: number
  _raw?: string
  _archived?: boolean
  _status?: 'completed' | 'failed'
  _archivedAt?: string
}

export interface JobInspectorProps {
  queueName: string
  onClose: () => void
}

export function JobInspector({ queueName, onClose }: JobInspectorProps) {
  const [view, setView] = React.useState<'waiting' | 'delayed' | 'failed' | 'archive'>('waiting')
  const [page, setPage] = React.useState(1)
  const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(new Set())
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean
    title: string
    message: string
    action: () => void
    variant?: 'danger' | 'warning' | 'info'
  } | null>(null)

  const queryClient = useQueryClient()

  const { isPending, error, data } = useQuery<{ jobs: Job[]; total?: number }>({
    queryKey: ['jobs', queueName, view, page],
    queryFn: () => {
      const url =
        view === 'archive'
          ? `/api/queues/${queueName}/archive?page=${page}&limit=50`
          : `/api/queues/${queueName}/jobs?type=${view}`
      return fetch(url).then((res) => res.json())
    },
  })

  // Reset selection when view changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to reset when view changes
  React.useEffect(() => {
    setSelectedIndices(new Set())
    setPage(1)
  }, [view])

  const toggleSelection = (index: number) => {
    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelectedIndices(next)
  }

  const toggleSelectAll = React.useCallback(() => {
    if (!data?.jobs) {
      return
    }
    const availableCount = data.jobs.filter((j) => j._raw && !j._archived).length
    if (selectedIndices.size === availableCount && availableCount > 0) {
      setSelectedIndices(new Set())
    } else {
      const indices = new Set<number>()
      data.jobs.forEach((j, i) => {
        if (j._raw && !j._archived) {
          indices.add(i)
        }
      })
      setSelectedIndices(indices)
    }
  }, [data?.jobs, selectedIndices])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        toggleSelectAll()
      }
      if (e.key === 'Escape') {
        if (confirmDialog?.open) {
          setConfirmDialog(null)
        } else if (selectedIndices.size > 0) {
          setSelectedIndices(new Set())
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndices, confirmDialog, toggleSelectAll, onClose])

  // Lock body scroll when modal opens
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [])

  const handleAction = async (action: 'delete' | 'retry', job: Job) => {
    if (!job._raw) {
      return
    }
    const endpoint = action === 'delete' ? 'delete' : 'retry'
    const body: any = { raw: job._raw }
    if (action === 'delete') {
      body.type = view
    }

    await fetch(`/api/queues/${queueName}/jobs/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    queryClient.invalidateQueries({ queryKey: ['jobs', queueName] })
    queryClient.invalidateQueries({ queryKey: ['queues'] })
  }

  const handleBulkAction = async (action: 'delete' | 'retry') => {
    if (selectedIndices.size === 0 || !data?.jobs) {
      return
    }

    const count = selectedIndices.size
    setConfirmDialog({
      open: true,
      title: `${action === 'delete' ? 'Delete' : 'Retry'} ${count} Jobs?`,
      message: `Are you sure you want to ${action} ${count} selected ${view} jobs in "${queueName}"?\n\nThis action cannot be undone.`,
      variant: action === 'delete' ? 'danger' : 'warning',
      action: async () => {
        setIsProcessing(true)
        try {
          const endpoint = action === 'delete' ? 'bulk-delete' : 'bulk-retry'
          const raws = Array.from(selectedIndices)
            .map((i) => data?.jobs[i]?._raw)
            .filter(Boolean) as string[]

          await fetch(`/api/queues/${queueName}/jobs/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: view, raws }),
          })

          setSelectedIndices(new Set())
          queryClient.invalidateQueries({ queryKey: ['jobs', queueName] })
          queryClient.invalidateQueries({ queryKey: ['queues'] })
          setConfirmDialog(null)
        } catch (err) {
          console.error(`Failed to ${action} jobs:`, err)
        } finally {
          setIsProcessing(false)
        }
      },
    })
  }


  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-end p-4 sm:p-6 outline-none pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-default pointer-events-auto"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-zinc-950 border-l border-white/10 h-screen w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden relative z-[1002] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-white/5 bg-black/40 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-3 font-heading tracking-tight italic uppercase">
              <Search className="text-primary" size={24} />
              Inspector <span className="text-primary/60">/</span> {queueName}
            </h2>
            <div className="flex items-center gap-3 mt-4">
              {(['waiting', 'delayed', 'failed', 'archive'] as const).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'text-[9px] font-black px-3 py-1.5 rounded-lg transition-all border shrink-0 uppercase tracking-[0.2em] font-mono',
                    view === v
                      ? v === 'failed'
                        ? 'bg-red-500 text-black border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        : v === 'delayed'
                          ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : v === 'archive'
                            ? 'bg-indigo-500 text-black border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                            : 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                      : 'bg-zinc-900 text-muted-foreground border-white/5 hover:bg-zinc-800'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-black/20 min-h-0 scrollbar-thin">
          {isPending && (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <RefreshCcw className="animate-spin text-primary opacity-40" size={32} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
                Syncing jobs...
              </p>
            </div>
          )}
          {error && (
            <div className="p-20 text-center">
              <div className="bg-red-500/10 text-red-500 p-8 rounded-2xl border border-red-500/20 font-black uppercase text-xs tracking-widest italic">
                Connection Fault: {error.message}
              </div>
            </div>
          )}

          {data?.jobs && data.jobs.length > 0 && (
            <div className="px-8 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
              <input
                type="checkbox"
                aria-label="Select all jobs"
                className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20"
                checked={
                  selectedIndices.size ===
                    data.jobs.filter((j) => j._raw && !j._archived).length &&
                  selectedIndices.size > 0
                }
                onChange={toggleSelectAll}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 font-heading">
                Batch Operations
              </span>
              {selectedIndices.size > 0 && (
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {selectedIndices.size} Selected
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                  >
                    Delete
                  </button>
                  {(view === 'delayed' || view === 'failed') && (
                    <button
                      type="button"
                      onClick={() => handleBulkAction('retry')}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase hover:bg-primary hover:text-black transition-all border border-primary/20"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {data?.jobs && data.jobs.length === 0 && (
            <div className="p-20 text-center text-muted-foreground flex flex-col items-center gap-6 opacity-40">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-primary/40 border border-white/5">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black font-heading uppercase italic tracking-widest">
                  Pipeline Clear
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Zero incidents detected in spectrum
                </p>
              </div>
            </div>
          )}

          {data?.jobs && (
            <div className="p-8 space-y-6">
              {data.jobs.map((job, i) => (
                <div
                  key={i}
                  className={cn(
                    'bg-zinc-900/40 border rounded-2xl overflow-hidden transition-all group border-white/5',
                    selectedIndices.has(i) && 'ring-2 ring-primary border-primary bg-primary/5'
                  )}
                >
                  <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center text-[10px] font-mono">
                    <div className="flex items-center gap-4">
                      {job._raw && !job._archived && (
                        <input
                          type="checkbox"
                          aria-label={`Select job ${job.id || i}`}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20"
                          checked={selectedIndices.has(i)}
                          onChange={() => toggleSelection(i)}
                        />
                      )}
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-2 border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
                        ID:{job.id || 'N/A'}
                        {job._archived && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[8px] border ml-1',
                              job._status === 'completed'
                                ? 'bg-green-500/20 text-green-500 border-green-500/20'
                                : 'bg-red-500/20 text-red-500 border-red-500/20'
                            )}
                          >
                            {job._status}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-white/20 font-black flex items-center gap-4 uppercase tracking-tighter">
                      {view === 'delayed' && job.scheduledAt && (
                        <span className="text-amber-500 flex items-center gap-1.5">
                          <Clock size={12} /> {new Date(job.scheduledAt).toLocaleString()}
                        </span>
                      )}
                      {view === 'failed' && job.failedAt && (
                        <span className="text-red-500 flex items-center gap-1.5">
                          <AlertCircle size={12} /> {new Date(job.failedAt).toLocaleString()}
                        </span>
                      )}
                      {job.timestamp &&
                        !job._archivedAt &&
                        new Date(job.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => job._raw && !job._archived && toggleSelection(i)}
                    className="w-full text-left cursor-pointer focus:outline-none focus:ring-inset"
                  >
                    {job.error && (
                      <div className="p-5 bg-red-500/10 text-red-500 text-xs font-black border-b border-red-500/10 flex items-start gap-3 uppercase tracking-tight">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{job.error}</p>
                      </div>
                    )}
                    <pre className="text-[11px] font-mono p-6 overflow-x-auto text-white/60 leading-relaxed bg-black/40">
                      {JSON.stringify(job, null, 2)}
                    </pre>
                  </button>
                  <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end gap-3">
                    {!job._archived && (
                      <button
                        type="button"
                        onClick={() => handleAction('delete', job)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-all font-heading border border-transparent hover:border-red-500/20"
                      >
                        Terminate
                      </button>
                    )}
                    {!job._archived && (view === 'delayed' || view === 'failed') && (
                      <button
                        type="button"
                        onClick={() => handleAction('retry', job)}
                        className={cn(
                          'text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl text-black shadow-lg transition-all font-heading',
                          view === 'delayed'
                            ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-400'
                            : 'bg-primary shadow-primary/20 hover:bg-primary/80'
                        )}
                      >
                        {view === 'delayed' ? 'Execute Now' : 'Re-Run Cycle'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {view === 'archive' && data?.total && data.total > 50 && (
                <div className="flex items-center justify-between py-6 border-t border-border/30">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Total {data.total} archived jobs
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                      className="p-2 rounded-lg bg-muted text-muted-foreground disabled:opacity-30 hover:bg-primary hover:text-white transition-all"
                    >
                      ←
                    </button>
                    <span className="text-xs font-bold px-4">{page}</span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * 50 >= (data.total || 0)}
                      aria-label="Next page"
                      className="p-2 rounded-lg bg-muted text-muted-foreground disabled:opacity-30 hover:bg-primary hover:text-white transition-all"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-card text-right flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 text-sm font-bold transition-all active:scale-95 uppercase tracking-widest"
          >
            Dismiss
          </button>
        </div>
      </motion.div>

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          isProcessing={isProcessing}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>,
    document.body
  )
}
