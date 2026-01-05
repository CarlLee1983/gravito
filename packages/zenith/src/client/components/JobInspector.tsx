import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Search } from 'lucide-react'
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
  const [totalCount, setTotalCount] = React.useState<number>(0)
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

  // Fetch total count for non-archive views
  React.useEffect(() => {
    if (view !== 'archive') {
      fetch(`/api/queues/${queueName}/jobs/count?type=${view}`)
        .then((res) => res.json())
        .then((data) => setTotalCount(data.count))
        .catch(() => setTotalCount(0))
    } else {
      setTotalCount(data?.total || 0)
    }
  }, [queueName, view, data?.total])

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

  const handleBulkActionAll = async (action: 'delete' | 'retry') => {
    if (view === 'archive') {
      return
    }

    setConfirmDialog({
      open: true,
      title: `${action === 'delete' ? 'Delete' : 'Retry'} ALL ${totalCount} Jobs?`,
      message: `⚠️ WARNING: This will ${action} ALL ${totalCount} ${view} jobs in "${queueName}".\n\nThis is a destructive operation that cannot be undone.`,
      variant: 'danger',
      action: async () => {
        setIsProcessing(true)
        try {
          const endpoint = action === 'delete' ? 'bulk-delete-all' : 'bulk-retry-all'
          await fetch(`/api/queues/${queueName}/jobs/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: view }),
          })

          setSelectedIndices(new Set())
          queryClient.invalidateQueries({ queryKey: ['jobs', queueName] })
          queryClient.invalidateQueries({ queryKey: ['queues'] })
          setConfirmDialog(null)
        } catch (err) {
          console.error(`Failed to ${action} all jobs:`, err)
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
        className="bg-card border border-border/50 h-[85vh] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden rounded-2xl relative z-[1002] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center bg-muted/20 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Search className="text-primary" size={20} />
              Queue Insight: <span className="text-primary">{queueName}</span>
            </h2>
            <div className="flex items-center gap-4 mt-2">
              {(['waiting', 'delayed', 'failed', 'archive'] as const).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'text-[9px] font-black px-3 py-1 rounded-sm transition-all border shrink-0 uppercase tracking-widest',
                    view === v
                      ? v === 'failed'
                        ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                        : v === 'delayed'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                          : v === 'archive'
                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                      : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
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
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/5 min-h-0">
          {isPending && (
            <div className="p-12 text-center text-muted-foreground font-medium animate-pulse">
              Loading jobs...
            </div>
          )}
          {error && (
            <div className="p-12 text-center text-red-500 font-bold">Error loading jobs</div>
          )}

          {data?.jobs && data.jobs.length > 0 && (
            <>
              <div className="px-6 py-3 border-b bg-muted/5 flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                  checked={
                    selectedIndices.size ===
                      data.jobs.filter((j) => j._raw && !j._archived).length &&
                    selectedIndices.size > 0
                  }
                  onChange={toggleSelectAll}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Select All (Page)
                </span>
                {view !== 'archive' && totalCount > 0 && (
                  <span className="text-[9px] text-muted-foreground/60 ml-2">
                    {data.jobs.filter((j) => !j._archived).length} of {totalCount} total
                  </span>
                )}
                {selectedIndices.size > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-primary mr-2">
                      {selectedIndices.size} items selected
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('delete')}
                      className="px-3 py-1 bg-red-500/10 text-red-500 rounded-md text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                    >
                      Delete Selected
                    </button>
                    {(view === 'delayed' || view === 'failed') && (
                      <button
                        type="button"
                        onClick={() => handleBulkAction('retry')}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        Retry Selected
                      </button>
                    )}
                  </div>
                )}
              </div>
              {view !== 'archive' && totalCount > data.jobs.filter((j) => !j._archived).length && (
                <div className="px-6 py-3 border-b bg-amber-500/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-2">
                    <AlertCircle size={14} />
                    Showing {data.jobs.filter((j) => !j._archived).length} of {totalCount} total{' '}
                    {view} jobs
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkActionAll('delete')}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-md text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                    >
                      Delete All {totalCount}
                    </button>
                    {(view === 'delayed' || view === 'failed') && (
                      <button
                        type="button"
                        onClick={() => handleBulkActionAll('retry')}
                        className="px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-md text-[10px] font-black uppercase hover:bg-amber-500 hover:text-white transition-all"
                      >
                        Retry All {totalCount}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {data?.jobs && data.jobs.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground/30">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-lg font-bold">Clear Sky!</p>
              <p className="text-sm opacity-60">No jobs found in this queue.</p>
            </div>
          )}
          {data?.jobs && (
            <div className="p-6 space-y-4">
              {data.jobs.map((job, i) => (
                <div
                  key={i}
                  className={cn(
                    'bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group border-border/50',
                    selectedIndices.has(i) && 'ring-2 ring-primary border-primary'
                  )}
                >
                  <div className="p-4 border-b bg-muted/10 flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-3">
                      {job._raw && !job._archived && (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border"
                          checked={selectedIndices.has(i)}
                          onChange={() => toggleSelection(i)}
                        />
                      )}
                      <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-2">
                        ID: {job.id || 'N/A'}
                        {job._archived && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[8px] border',
                              job._status === 'completed'
                                ? 'bg-green-500/20 text-green-500 border-green-500/20'
                                : 'bg-red-500/20 text-red-500 border-red-500/20'
                            )}
                          >
                            Archive: {job._status}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-semibold flex items-center gap-3">
                      {view === 'delayed' && job.scheduledAt && (
                        <span className="text-amber-500 flex items-center gap-1 font-bold">
                          <Clock size={12} /> {new Date(job.scheduledAt).toLocaleString()}
                        </span>
                      )}
                      {view === 'failed' && job.failedAt && (
                        <span className="text-red-500 flex items-center gap-1 font-bold">
                          <AlertCircle size={12} /> {new Date(job.failedAt).toLocaleString()}
                        </span>
                      )}
                      {job._archivedAt && (
                        <span className="text-indigo-400 flex items-center gap-1 font-bold">
                          <ArrowRight size={12} /> {new Date(job._archivedAt).toLocaleString()}
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
                    className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                  >
                    {job.error && (
                      <div className="p-4 bg-red-500/10 text-red-500 text-xs font-semibold border-b border-red-500/10 flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <p>{job.error}</p>
                      </div>
                    )}
                    <pre className="text-[11px] font-mono p-4 overflow-x-auto text-foreground/80 leading-relaxed bg-muted/5">
                      {JSON.stringify(job, null, 2)}
                    </pre>
                  </button>
                  <div className="p-3 bg-muted/5 border-t border-border/50 flex justify-end gap-2">
                    {!job._archived && (
                      <button
                        type="button"
                        onClick={() => handleAction('delete', job)}
                        className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                      >
                        Terminate
                      </button>
                    )}
                    {!job._archived && (view === 'delayed' || view === 'failed') && (
                      <button
                        type="button"
                        onClick={() => handleAction('retry', job)}
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg text-white shadow-sm transition-all',
                          view === 'delayed'
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        )}
                      >
                        {view === 'delayed' ? 'Process Now' : 'Retry Job'}
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
                      className="p-2 rounded-lg bg-muted text-muted-foreground disabled:opacity-30 hover:bg-primary hover:text-white transition-all"
                    >
                      ←
                    </button>
                    <span className="text-xs font-bold px-4">{page}</span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * 50 >= (data.total || 0)}
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
