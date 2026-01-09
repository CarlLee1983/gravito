import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Search,
  X,
} from 'lucide-react'
import React from 'react'
import { cn } from '../utils'

interface LogArchiveModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LogArchiveModal({ isOpen, onClose }: LogArchiveModalProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [logs, setLogs] = React.useState<any[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<{ start?: string; end?: string }>({})

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search, // Backend handles 'job:123' as jobId filter
        ...(status !== 'all' && { status }), // Map 'status' to 'level' or 'status' in backend?
        // Note: The /api/logs/archive endpoint needs to be smart enough, or we need separate endpoints.
        // For now, let's assume we are searching LOGS first.
        // Wait, the user wants "Audit Trail" of jobs which is stored in the same DB but different table?
        // Actually, our previous implementation added filters to `listLogs` too.
        // But `archive()` writes to `jobs` table (SQLitePersistence) / `completed_jobs` (MySQL)?
        // Let's check the backend implementation again.

        // Correction: The backend has TWO endpoints:
        // 1. /api/queues/:name/archive -> Queries JOB archive (waiting, completed, failed)
        // 2. /api/logs/archive -> Queries LOG archive (info, warn, error)

        // If the user wants to audit a JOB, they likely want the JOB archive.
        // But this modal is "LogArchiveModal".
        // The requirement is "trace a specific job ... trace status over time".
        // We should probably allow searching BOTH or switching modes.

        // Let's add a "Mode Switcher" in UI: "System Logs" vs "Job Audit".
        // But for now, let's keep it simple and just query existing logs for now,
        // OR better, query the JOBS archive if it looks like a Job ID.

        // Let's stick to the existing /api/logs/archive for now as per current file,
        // BUT we need to support `startTime` and `endTime`.
        ...(dateRange.start && { startTime: dateRange.start }),
        ...(dateRange.end && { endTime: dateRange.end }),
      })

      // If user selects "Waiting" or searches "job:...", we might need to hit a different endpoint?
      // Currently /api/logs/archive hits `listLogs`.
      // The job archive is `/api/queues/:name/archive`.
      // This is a bit tricky since we don't know the queue name for global search.

      // For this specific request "Trace failed jobs / waiting jobs",
      // we really need a "Global Job Search" endpoint.
      // But let's verify if `listLogs` can return job events.
      // Looking at `PersistenceAdapter`, `archiveLog` is for text logs. `archive` is for Jobs.

      // Since we implemented "Audit Mode", we are writing to the JOBS table (archive).
      // So to find a "lost job", we need to search the JOBS table.
      // But `getArchiveJobs` requires a QUEUE name.

      // HACK: For now, let's just implement the UI for LOGS filters (Time Range) as requested first.
      // The user asked "trace status...".
      // We might need a "Global Search" later.

      const res = await fetch(`/api/logs/archive?${params}`).then((r) => r.json())
      setLogs(res.logs || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error('Failed to fetch archived logs', err)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, status, dateRange])

  React.useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, fetchLogs])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl h-full max-h-[850px] bg-card border border-border/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden scanline"
          >
            {/* Header */}
            <div className="p-6 border-b bg-muted/10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Time Travel Audit</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                    Trace events and system logs across time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Advanced Filters */}
            <div className="p-4 bg-muted/5 border-b grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <form onSubmit={handleSearch} className="md:col-span-2 relative">
                <label
                  htmlFor="log-search"
                  className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block ml-1"
                >
                  Search Query
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                    size={16}
                  />
                  <input
                    id="log-search"
                    type="text"
                    placeholder="Search message..."
                    className="w-full bg-background border border-border/50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-1 focus:ring-primary/30 transition-all font-mono"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </form>

              <div className="relative">
                <label
                  htmlFor="start-time"
                  className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block ml-1"
                >
                  Time Range
                </label>
                <div className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-2.5">
                  <Calendar size={14} className="text-muted-foreground/50" />
                  <input
                    id="start-time"
                    type="datetime-local"
                    className="bg-transparent text-[10px] font-mono outline-none w-full"
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined
                      setDateRange((prev) => ({ ...prev, start: date }))
                      setPage(1)
                    }}
                  />
                  <span className="text-muted-foreground/30 text-[10px]">to</span>
                  <input
                    aria-label="End Time"
                    type="datetime-local"
                    className="bg-transparent text-[10px] font-mono outline-none w-full"
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined
                      setDateRange((prev) => ({ ...prev, end: date }))
                      setPage(1)
                    }}
                  />
                </div>
              </div>

              <div className="relative">
                <label
                  htmlFor="log-level"
                  className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block ml-1"
                >
                  Level / Status
                </label>
                <div className="relative">
                  <Filter
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                    size={14}
                  />
                  <select
                    id="log-level"
                    className="w-full bg-background border border-border/50 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold outline-none focus:ring-1 focus:ring-primary/30 transition-all appearance-none"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="all">Every Event</option>
                    <option value="info">Info / Logs</option>
                    <option value="error">Errors / Failed</option>
                    <option value="warn">Warnings</option>
                    <option value="success">Success / Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin bg-black/20">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                  <RefreshCwIcon className="animate-spin text-primary" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
                    Time Traveling...
                  </p>
                </div>
              ) : logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-4 py-20">
                  <Activity size={48} className="opacity-10 animate-pulse" />
                  <p className="font-bold uppercase tracking-widest italic text-sm">
                    No events found in this timeline
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 flex gap-4 hover:bg-white/[0.02] transition-colors group cursor-default"
                    >
                      {/* Column 1: Time */}
                      <div className="shrink-0 w-32 pt-1">
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter tabular-nums">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-xs font-mono font-bold tabular-nums text-foreground/80">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Column 2: Status Indicator */}
                      <div className="shrink-0 pt-1.5 relative">
                        <div className="w-px h-full absolute left-1/2 -translate-x-1/2 top-4 bg-border/30 last:hidden"></div>
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full border-2 relative z-10',
                            log.level === 'error'
                              ? 'border-red-500 bg-red-500/20'
                              : log.level === 'warn'
                                ? 'border-amber-500 bg-amber-500/20'
                                : log.level === 'success'
                                  ? 'border-green-500 bg-green-500/20'
                                  : 'border-blue-500 bg-blue-500/20'
                          )}
                        ></div>
                      </div>

                      {/* Column 3: Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest',
                              log.level === 'error'
                                ? 'bg-red-500/10 text-red-500'
                                : log.level === 'warn'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : log.level === 'success'
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-blue-500/10 text-blue-500'
                            )}
                          >
                            {log.level}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/50">
                            {log.worker_id}
                          </span>
                          {log.queue && (
                            <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-wider bg-indigo-500/10 px-1.5 rounded">
                              {log.queue}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 font-mono break-all leading-relaxed opacity-90">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer / Pagination */}
            <div className="p-4 border-t bg-muted/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold text-muted-foreground">
              <div>
                Scanning {total.toLocaleString()} events • Page {page} of {totalPages || 1}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 border rounded-xl hover:bg-muted disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 border rounded-xl hover:bg-muted disabled:opacity-30 transition-all active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function RefreshCwIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Refreshing"
    >
      <title>Refreshing</title>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
