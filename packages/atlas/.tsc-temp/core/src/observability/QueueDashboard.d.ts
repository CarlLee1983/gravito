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
export declare class QueueDashboard {
  private readonly config
  constructor(config: QueueDashboardConfig)
  /**
   * Get current queue metrics (depth, backpressure state, enqueue rate)
   */
  getQueueMetrics(): QueueMetrics
  /**
   * Get current worker pool metrics (size, utilization, success rate)
   */
  getWorkerMetrics(): WorkerMetrics
  /**
   * Get job event timeline from DLQ entries (recent failures)
   * @param limit Maximum number of entries to return (default: 50)
   */
  getJobTimeline(limit?: number): JobEvent[]
  /**
   * Get error statistics including circuit breaker status and DLQ counts
   */
  getErrorBreakdown(): ErrorStats
  /**
   * Export metrics in JSON or Prometheus format
   * @param format Export format: 'json' or 'prometheus'
   */
  exportMetrics(format: 'json' | 'prometheus'): string
  /**
   * Get complete snapshot of all metrics at a point in time
   */
  getSnapshot(options?: { timelineLimit?: number }): DashboardSnapshot
  /**
   * Format metrics in Prometheus/OpenMetrics text format
   */
  private formatPrometheus
  /**
   * Escape special characters in Prometheus labels
   */
  private escapePrometheusLabel
}
