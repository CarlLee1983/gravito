import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useNotifications } from '../contexts/NotificationContext'

// Update interface to match actual API response
interface ScheduleInfo {
  id: string
  cron: string
  queue: string
  job: {
    className?: string
    name?: string
    data?: any
    payload?: any
  }
  lastRun?: number | string
  nextRun?: number | string
}

interface QueueListItem {
  name: string
  waiting: number
  delayed: number
  failed: number
  active: number
  paused: boolean
}

export function SchedulesPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    cron: '',
    queue: 'default',
    className: '',
    payload: '{}',
  })

  const [confirmRunId, setConfirmRunId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { addNotification } = useNotifications()

  const { data: queueData } = useQuery<{ queues: QueueListItem[] }>({
    queryKey: ['queues'],
    queryFn: () => fetch('/api/queues').then((res) => res.json()),
  })

  const { data, isLoading } = useQuery<{ schedules: ScheduleInfo[] }>({
    queryKey: ['schedules'],
    queryFn: () => fetch('/api/schedules').then((res) => res.json()),
  })

  const runMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/schedules/run/${id}`, { method: 'POST' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      addNotification({
        type: 'success',
        title: 'Schedule Triggered',
        message: `Job ${id} has been manually pushed to the queue.`,
      })
      setConfirmRunId(null)
    },
    onError: (err: any) => {
      addNotification({
        type: 'error',
        title: 'Trigger Failed',
        message: err.message || 'Failed to run schedule manually.',
      })
      setConfirmRunId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/schedules/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      addNotification({
        type: 'info',
        title: 'Schedule Deleted',
        message: `Schedule ${id} was removed.`,
      })
      setConfirmDeleteId(null)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (body: any) =>
      fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setIsModalOpen(false)
      setFormData({ id: '', cron: '', queue: 'default', className: '', payload: '{}' })
      addNotification({
        type: 'success',
        title: 'Schedule Registered',
        message: 'New recurring task is now active.',
      })
    },
  })

  const schedules = data?.schedules || []
  const queues = queueData?.queues || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = JSON.parse(formData.payload)
      registerMutation.mutate({
        id: formData.id,
        cron: formData.cron,
        queue: formData.queue,
        job: {
          className: formData.className,
          payload,
        },
      })
    } catch (_err) {
      alert('Invalid JSON payload')
    }
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Schedules</h1>
          <p className="text-muted-foreground mt-2 text-sm font-bold opacity-60 uppercase tracking-widest text-[10px]">
            Manage recurring tasks and cron workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={18} />
          New Schedule
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card-premium p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Active Schedules
            </p>
            <p className="text-2xl font-black">{isLoading ? '...' : schedules.length}</p>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Total Executions
            </p>
            <p className="text-2xl font-black">---</p>
          </div>
        </div>
        <div className="card-premium p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Health Score
            </p>
            <p className="text-2xl font-black text-green-500">99.8%</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            size={18}
          />
          <input
            type="text"
            placeholder="Search schedules by name, cron or ID..."
            className="w-full bg-muted/40 border-border/50 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none transition-all"
          />
        </div>
        <button
          type="button"
          className="p-3 bg-muted/40 border border-border/50 rounded-xl hover:bg-muted/60 transition-all"
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-premium p-6 h-32 animate-pulse bg-muted/20" />
          ))}
        </div>
      )}

      {/* Implementation Empty State if zero */}
      {schedules.length === 0 && !isLoading && (
        <div className="card-premium p-20 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-6">
            <Clock size={32} className="text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Scheduled Tasks Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-8">
            Register recurring jobs using the @gravito/stream scheduler to see them appear here.
          </p>
        </div>
      )}

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 gap-4">
        {schedules.map((schedule: ScheduleInfo) => (
          <div
            key={schedule.id}
            className="card-premium p-6 group hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <Clock size={28} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold">{schedule.id}</h3>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded">
                      Enabled
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} /> {schedule.cron}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ArrowRight size={12} /> {schedule.queue}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded font-mono text-[10px] uppercase font-black">
                      {schedule.job.className}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={runMutation.isPending}
                  onClick={() => setConfirmRunId(schedule.id)}
                  className="px-4 py-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {runMutation.isPending && runMutation.variables === schedule.id ? (
                    <>
                      <RefreshCcw size={12} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    'Run Now'
                  )}
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground"
                >
                  <AlertCircle size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(schedule.id)}
                  className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all text-muted-foreground"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/60">
                  <Calendar size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">
                    Last Run
                  </p>
                  <p className="text-xs font-bold">
                    {schedule.lastRun
                      ? format(new Date(schedule.lastRun), 'HH:mm:ss MMM dd')
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Play size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">
                    Next Run
                  </p>
                  <p className="text-xs font-bold">
                    {schedule.nextRun
                      ? format(new Date(schedule.nextRun), 'HH:mm:ss MMM dd')
                      : 'Scheduled'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Schedule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between bg-muted/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold leading-none">Register Schedule</h2>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                      Add new recurring job
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="schedule-id"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    Schedule Identifier (ID)
                  </label>
                  <input
                    id="schedule-id"
                    required
                    type="text"
                    placeholder="daily-cleanup-job"
                    className="w-full bg-muted/40 border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="cron-expression"
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >
                      Cron Expression
                    </label>
                    <input
                      id="cron-expression"
                      required
                      type="text"
                      placeholder="* * * * *"
                      className="w-full bg-muted/40 border-border/50 rounded-xl px-4 py-3 text-sm font-mono focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                      value={formData.cron}
                      onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="target-queue"
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >
                      Target Queue
                    </label>
                    <div className="relative">
                      <select
                        id="target-queue"
                        className="w-full bg-muted/40 border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none transition-all appearance-none cursor-pointer"
                        value={formData.queue}
                        onChange={(e) => setFormData({ ...formData, queue: e.target.value })}
                      >
                        {queues.map((q: any) => (
                          <option key={q.name} value={q.name}>
                            {q.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        size={16}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="job-class-name"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    Job Class Name
                  </label>
                  <input
                    id="job-class-name"
                    required
                    type="text"
                    placeholder="CleanupJob"
                    className="w-full bg-muted/40 border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none transition-all font-mono"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="job-payload"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    Job Payload (JSON)
                  </label>
                  <textarea
                    id="job-payload"
                    rows={3}
                    className="w-full bg-muted/40 border-border/50 rounded-xl px-4 py-3 text-sm font-mono focus:ring-1 focus:ring-primary/30 outline-none transition-all resize-none"
                    value={formData.payload}
                    onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 border border-border/50 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Register Schedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmRunId}
        title="Manual trigger confirmation"
        message={`Are you sure you want to run "${confirmRunId}" immediately?\nThis will bypass the next scheduled time and push a job to the "${schedules.find((s) => s.id === confirmRunId)?.queue}" queue.`}
        confirmText="Run Now"
        variant="info"
        isProcessing={runMutation.isPending}
        onConfirm={() => confirmRunId && runMutation.mutate(confirmRunId)}
        onCancel={() => setConfirmRunId(null)}
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Schedule"
        message={`Are you sure you want to delete "${confirmDeleteId}"?\nThis action cannot be undone and recurring jobs for this schedule will stop.`}
        confirmText="Delete"
        variant="danger"
        isProcessing={deleteMutation.isPending}
        onConfirm={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
