/**
 * Base interface for all queue bridges.
 * A bridge attaches to a queue worker and reports job lifecycle events to Zenith.
 */
export interface QueueBridge {
  /**
   * Attach the bridge to a worker/queue instance.
   * @param target - The worker or queue instance to monitor
   */
  attach(target: any): void

  /**
   * Detach the bridge and clean up event listeners.
   */
  detach(): void
}

/**
 * Log payload sent to Zenith.
 */
export interface ZenithLogPayload {
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  jobId?: string
  workerId?: string
  timestamp?: string
  context?: Record<string, any>
}
