import type { DeadLetterQueue } from '../events/DeadLetterQueue'
import type { EventPriorityQueue } from '../events/EventPriorityQueue'
import type { MessageQueueBridge } from '../events/MessageQueueBridge'
import type { WorkerPool } from '../events/WorkerPool'
import type { HookManager } from '../HookManager'

/**
 * Configuration for QueueDashboard
 * All subsystem references are optional to support progressive integration
 */
export interface QueueDashboardConfig {
  eventQueue?: EventPriorityQueue
  workerPool?: WorkerPool
  hookManager?: HookManager
  dlq?: DeadLetterQueue
  messageQueueBridge?: MessageQueueBridge
}

/**
 * Queue depth and backpressure metrics
 */
export interface QueueMetrics {
  depth: {
    total: number
    high: number
    normal: number
    low: number
  }
  backpressure: {
    state: string
    rejectedCount: number
    degradedCount: number
    enqueueRate: number
  }
  processing: boolean
}

/**
 * Worker pool and thread statistics
 */
export interface WorkerMetrics {
  poolSize: number
  activeWorkers: number
  utilization: number
  queueDepth: number
  totalProcessed: number
  totalSuccess: number
  totalFailures: number
  successRate: number
  workers: Array<{
    id: string
    state: string
    tasksProcessed: number
    tasksSucceeded: number
    tasksFailed: number
    avgDurationMs: number
    currentLoad: number
  }>
}

/**
 * Timeline event for job processing history
 */
export interface JobEvent {
  id: string
  hook: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'in_dlq'
  priority: string
  createdAt: number
  error?: string
  retryCount: number
}

/**
 * Error statistics and circuit breaker status
 */
export interface ErrorStats {
  totalErrors: number
  byEvent: Record<string, number>
  circuitBreakers: Array<{
    eventName: string
    state: string
    failures: number
    successes: number
  }>
  dlqCount: number
}

/**
 * Complete dashboard snapshot at a point in time
 */
export interface DashboardSnapshot {
  timestamp: number
  queue: QueueMetrics
  workers: WorkerMetrics
  timeline: JobEvent[]
  errors: ErrorStats
}

/**
 * QueueDashboard aggregates metrics from all event processing subsystems
 * Uses Facade pattern to read-only aggregate data without modifying subsystems
 */
export class QueueDashboard {
  private readonly config: QueueDashboardConfig

  constructor(config: QueueDashboardConfig) {
    this.config = config
  }

  /**
   * Get current queue metrics (depth, backpressure state, enqueue rate)
   */
  getQueueMetrics(): QueueMetrics {
    const eventQueue = this.config.eventQueue
    const backpressureManager = eventQueue?.getBackpressureManager?.()

    // Default values when no event queue configured
    if (!eventQueue) {
      return {
        depth: { total: 0, high: 0, normal: 0, low: 0 },
        backpressure: {
          state: 'NORMAL',
          rejectedCount: 0,
          degradedCount: 0,
          enqueueRate: 0,
        },
        processing: false,
      }
    }

    const depth = {
      total: eventQueue.getDepth(),
      high: eventQueue.getDepthByPriority?.('high') ?? 0,
      normal: eventQueue.getDepthByPriority?.('normal') ?? 0,
      low: eventQueue.getDepthByPriority?.('low') ?? 0,
    }

    let backpressure = {
      state: 'NORMAL',
      rejectedCount: 0,
      degradedCount: 0,
      enqueueRate: 0,
    }

    if (backpressureManager) {
      const state = backpressureManager.getState?.()
      const metrics = backpressureManager.getMetrics?.()

      backpressure = {
        state: state ?? 'NORMAL',
        rejectedCount: metrics?.rejectedCount ?? 0,
        degradedCount: metrics?.degradedCount ?? 0,
        enqueueRate: metrics?.enqueueRate ?? 0,
      }
    }

    return {
      depth,
      backpressure,
      processing: depth.total > 0,
    }
  }

  /**
   * Get current worker pool metrics (size, utilization, success rate)
   */
  getWorkerMetrics(): WorkerMetrics {
    const workerPool = this.config.workerPool

    // Default values when no worker pool configured
    if (!workerPool) {
      return {
        poolSize: 0,
        activeWorkers: 0,
        utilization: 0,
        queueDepth: 0,
        totalProcessed: 0,
        totalSuccess: 0,
        totalFailures: 0,
        successRate: 1.0,
        workers: [],
      }
    }

    const poolStats = workerPool.getPoolStats?.() ?? {
      queueDepth: 0,
      utilization: 0,
      activeWorkers: 0,
      totalTasksProcessed: 0,
      totalSuccess: 0,
      totalFailures: 0,
    }

    const workerStats = workerPool.getWorkerStats?.() ?? []

    const totalProcessed = poolStats.totalTasksProcessed ?? 0
    const successRate = totalProcessed > 0 ? (poolStats.totalSuccess ?? 0) / totalProcessed : 1.0

    return {
      poolSize: (workerPool as any).config?.workerThreads ?? 0,
      activeWorkers: poolStats.activeWorkers ?? 0,
      utilization: poolStats.utilization ?? 0,
      queueDepth: poolStats.queueDepth ?? 0,
      totalProcessed,
      totalSuccess: poolStats.totalSuccess ?? 0,
      totalFailures: poolStats.totalFailures ?? 0,
      successRate,
      workers: workerStats.map((w) => ({
        id: w.id,
        state: w.state,
        tasksProcessed: w.tasksProcessed ?? 0,
        tasksSucceeded: w.tasksSuccess ?? 0,
        tasksFailed: w.tasksFailed ?? 0,
        avgDurationMs: w.avgDurationMs ?? 0,
        currentLoad: 0,
      })),
    }
  }

  /**
   * Get job event timeline from DLQ entries (recent failures)
   * @param limit Maximum number of entries to return (default: 50)
   */
  getJobTimeline(limit = 50): JobEvent[] {
    const dlq = this.config.dlq

    if (!dlq) {
      return []
    }

    const dlqEntries = dlq.list?.({ limit }) ?? []

    return dlqEntries.map((entry) => ({
      id: entry.id ?? '',
      hook: entry.eventName ?? 'unknown',
      status: 'in_dlq' as const,
      priority: entry.options?.priority ?? 'normal',
      createdAt: entry.firstFailedAt ?? Date.now(),
      error: entry.error?.message ?? entry.error,
      retryCount: entry.retryCount ?? 0,
    }))
  }

  /**
   * Get error statistics including circuit breaker status and DLQ counts
   */
  getErrorBreakdown(): ErrorStats {
    const dlq = this.config.dlq
    const hookManager = this.config.hookManager

    // Get DLQ statistics
    const dlqCount = dlq?.getCount?.() ?? 0
    const dlqEntries = dlq?.list?.({ limit: 1000 }) ?? []

    // Count errors by event name
    const byEvent: Record<string, number> = {}
    for (const entry of dlqEntries) {
      const eventName = entry.eventName ?? 'unknown'
      byEvent[eventName] = (byEvent[eventName] ?? 0) + 1
    }

    // Get circuit breaker statistics
    const circuitBreakers = hookManager?.getCircuitBreakerStats?.() ?? []

    const totalErrors =
      dlqCount + circuitBreakers.reduce((sum, cb) => sum + (cb.totalFailures ?? 0), 0)

    return {
      totalErrors,
      byEvent,
      circuitBreakers: circuitBreakers.map((cb) => ({
        eventName: cb.eventName ?? '',
        state: cb.state ?? 'CLOSED',
        failures: cb.totalFailures ?? 0,
        successes: cb.totalSuccesses ?? 0,
      })),
      dlqCount,
    }
  }

  /**
   * Export metrics in JSON or Prometheus format
   * @param format Export format: 'json' or 'prometheus'
   */
  exportMetrics(format: 'json' | 'prometheus'): string {
    const snapshot = this.getSnapshot()

    if (format === 'json') {
      return JSON.stringify(snapshot, null, 2)
    }

    return this.formatPrometheus(snapshot)
  }

  /**
   * Get complete snapshot of all metrics at a point in time
   */
  getSnapshot(options?: { timelineLimit?: number }): DashboardSnapshot {
    return {
      timestamp: Date.now(),
      queue: this.getQueueMetrics(),
      workers: this.getWorkerMetrics(),
      timeline: this.getJobTimeline(options?.timelineLimit ?? 50),
      errors: this.getErrorBreakdown(),
    }
  }

  /**
   * Format metrics in Prometheus/OpenMetrics text format
   */
  private formatPrometheus(snapshot: DashboardSnapshot): string {
    const lines: string[] = []

    // Queue depth metrics
    lines.push('# HELP gravito_queue_depth Current queue depth by priority')
    lines.push('# TYPE gravito_queue_depth gauge')
    lines.push(`gravito_queue_depth{priority="high"} ${snapshot.queue.depth.high}`)
    lines.push(`gravito_queue_depth{priority="normal"} ${snapshot.queue.depth.normal}`)
    lines.push(`gravito_queue_depth{priority="low"} ${snapshot.queue.depth.low}`)
    lines.push(`gravito_queue_depth{priority="total"} ${snapshot.queue.depth.total}`)
    lines.push('')

    // Backpressure metrics
    lines.push('# HELP gravito_backpressure_state Current backpressure state')
    lines.push('# TYPE gravito_backpressure_state gauge')
    const stateValue =
      snapshot.queue.backpressure.state === 'CRITICAL'
        ? 3
        : snapshot.queue.backpressure.state === 'WARNING'
          ? 2
          : snapshot.queue.backpressure.state === 'OVERFLOW'
            ? 4
            : 1
    lines.push(`gravito_backpressure_state ${stateValue}`)
    lines.push('')

    lines.push(
      '# HELP gravito_backpressure_rejected_total Total rejected events due to backpressure'
    )
    lines.push('# TYPE gravito_backpressure_rejected_total counter')
    lines.push(`gravito_backpressure_rejected_total ${snapshot.queue.backpressure.rejectedCount}`)
    lines.push('')

    lines.push('# HELP gravito_backpressure_enqueue_rate Current enqueue rate')
    lines.push('# TYPE gravito_backpressure_enqueue_rate gauge')
    lines.push(`gravito_backpressure_enqueue_rate ${snapshot.queue.backpressure.enqueueRate}`)
    lines.push('')

    // Worker pool metrics
    lines.push('# HELP gravito_worker_pool_size Total worker threads in pool')
    lines.push('# TYPE gravito_worker_pool_size gauge')
    lines.push(`gravito_worker_pool_size ${snapshot.workers.poolSize}`)
    lines.push('')

    lines.push('# HELP gravito_worker_pool_active Active workers')
    lines.push('# TYPE gravito_worker_pool_active gauge')
    lines.push(`gravito_worker_pool_active ${snapshot.workers.activeWorkers}`)
    lines.push('')

    lines.push('# HELP gravito_worker_pool_utilization Worker pool utilization ratio')
    lines.push('# TYPE gravito_worker_pool_utilization gauge')
    lines.push(`gravito_worker_pool_utilization ${snapshot.workers.utilization}`)
    lines.push('')

    // Task processing metrics
    lines.push('# HELP gravito_worker_tasks_processed Total tasks processed')
    lines.push('# TYPE gravito_worker_tasks_processed counter')
    lines.push(`gravito_worker_tasks_processed ${snapshot.workers.totalProcessed}`)
    lines.push('')

    lines.push('# HELP gravito_worker_tasks_success Total successful tasks')
    lines.push('# TYPE gravito_worker_tasks_success counter')
    lines.push(`gravito_worker_tasks_success ${snapshot.workers.totalSuccess}`)
    lines.push('')

    lines.push('# HELP gravito_worker_tasks_failed Total failed tasks')
    lines.push('# TYPE gravito_worker_tasks_failed counter')
    lines.push(`gravito_worker_tasks_failed ${snapshot.workers.totalFailures}`)
    lines.push('')

    lines.push('# HELP gravito_worker_success_rate Task success rate ratio')
    lines.push('# TYPE gravito_worker_success_rate gauge')
    lines.push(`gravito_worker_success_rate ${snapshot.workers.successRate}`)
    lines.push('')

    // Circuit breaker metrics
    lines.push('# HELP gravito_circuit_breaker_failures Total failures per circuit breaker')
    lines.push('# TYPE gravito_circuit_breaker_failures gauge')
    for (const cb of snapshot.errors.circuitBreakers) {
      lines.push(
        `gravito_circuit_breaker_failures{event="${this.escapePrometheusLabel(cb.eventName)}"} ${cb.failures}`
      )
    }
    lines.push('')

    lines.push('# HELP gravito_circuit_breaker_successes Total successes per circuit breaker')
    lines.push('# TYPE gravito_circuit_breaker_successes gauge')
    for (const cb of snapshot.errors.circuitBreakers) {
      lines.push(
        `gravito_circuit_breaker_successes{event="${this.escapePrometheusLabel(cb.eventName)}"} ${cb.successes}`
      )
    }
    lines.push('')

    // Error metrics by event
    lines.push('# HELP gravito_errors_by_event Total errors per event name')
    lines.push('# TYPE gravito_errors_by_event gauge')
    for (const [eventName, count] of Object.entries(snapshot.errors.byEvent)) {
      lines.push(
        `gravito_errors_by_event{event="${this.escapePrometheusLabel(eventName)}"} ${count}`
      )
    }
    lines.push('')

    // Error metrics
    lines.push('# HELP gravito_errors_total Total number of errors')
    lines.push('# TYPE gravito_errors_total counter')
    lines.push(`gravito_errors_total ${snapshot.errors.totalErrors}`)
    lines.push('')

    lines.push('# HELP gravito_dlq_size Current size of dead letter queue')
    lines.push('# TYPE gravito_dlq_size gauge')
    lines.push(`gravito_dlq_size ${snapshot.errors.dlqCount}`)
    lines.push('')

    return lines.join('\n')
  }

  /**
   * Escape special characters in Prometheus labels
   */
  private escapePrometheusLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
  }
}
