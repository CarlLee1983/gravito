/**
 * @gravito/atlas - Connection Pool Warmer
 * @description Preheats connection pools during initialization
 */

import type { ConnectionManager } from '../connection/ConnectionManager'

export interface PoolWarmerConfig {
  /**
   * Target number of connections to warm for each pool
   * @default 2
   */
  targetConnections?: number

  /**
   * Number of concurrent warmup queries
   * @default 2
   */
  concurrency?: number

  /**
   * Timeout (ms) for each warmup query
   * @default 5000
   */
  timeout?: number

  /**
   * Callback when warmup completes
   */
  onComplete?: (result: WarmupResult) => void

  /**
   * Callback for individual connection warmup
   */
  onConnectionWarmed?: (connection: string, duration: number) => void
}

export interface ConnectionWarmupResult {
  /**
   * Whether warmup succeeded
   */
  success: boolean

  /**
   * Connection name
   */
  connection: string

  /**
   * Time spent warming up (ms)
   */
  duration: number

  /**
   * Error message (if failed)
   */
  error?: string
}

export interface WarmupResult {
  /**
   * Total connections processed
   */
  total: number

  /**
   * Number of successful warmups
   */
  successful: number

  /**
   * Number of failed warmups
   */
  failed: number

  /**
   * Results for each connection
   */
  results: Record<string, ConnectionWarmupResult>

  /**
   * Total duration (ms)
   */
  duration: number
}

export const DEFAULT_WARMER_CONFIG: PoolWarmerConfig = {
  targetConnections: 2,
  concurrency: 2,
  timeout: 5000,
}

/**
 * Connection pool warmer
 * Preheats pools by establishing connections
 */
export class PoolWarmer {
  constructor(
    private connectionManager: ConnectionManager,
    private config: PoolWarmerConfig
  ) {}

  /**
   * Warm all connection pools
   */
  async warmAll(): Promise<WarmupResult> {
    const startTime = Date.now()
    const connectionNames = this.connectionManager.getConnectionNames()
    const results: Record<string, ConnectionWarmupResult> = {}

    for (const name of connectionNames) {
      results[name] = await this.warmConnection(name)
    }

    const result = {
      total: connectionNames.length,
      successful: Object.values(results).filter((r) => r.success).length,
      failed: Object.values(results).filter((r) => !r.success).length,
      results,
      duration: Date.now() - startTime,
    }

    this.config.onComplete?.(result)
    return result
  }

  /**
   * Warm a specific connection pool
   */
  async warmConnection(name: string): Promise<ConnectionWarmupResult> {
    const startTime = Date.now()

    try {
      const connection = this.connectionManager.connection(name)
      const _config = connection.getConfig()
      const targetCount = this.config.targetConnections ?? 2
      const concurrency = this.config.concurrency ?? 2
      const timeout = this.config.timeout ?? 5000

      // Establish target number of connections concurrently
      const tasks: Promise<void>[] = []
      let hasError = false
      let lastError: Error | undefined

      for (let i = 0; i < targetCount; i++) {
        const task = this.executeWarmupQuery(connection, timeout).catch((err) => {
          hasError = true
          lastError = err
        })
        tasks.push(task)

        // If we've queued enough tasks, wait for some to complete
        if (tasks.length >= concurrency) {
          await Promise.allSettled(tasks.splice(0, Math.floor(concurrency / 2)))
        }
      }

      // Wait for remaining tasks
      if (tasks.length > 0) {
        await Promise.allSettled(tasks)
      }

      if (hasError) {
        throw lastError ?? new Error('Warmup query failed')
      }

      const duration = Date.now() - startTime
      this.config.onConnectionWarmed?.(name, duration)

      return {
        success: true,
        connection: name,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const message = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        connection: name,
        duration,
        error: message,
      }
    }
  }

  /**
   * Execute a warmup query with timeout
   */
  private async executeWarmupQuery(connection: any, timeout: number): Promise<void> {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), timeout)

    try {
      await Promise.race([
        connection.raw('SELECT 1'),
        new Promise((_, reject) =>
          controller.signal.addEventListener('abort', () =>
            reject(new Error(`Warmup query timeout after ${timeout}ms`))
          )
        ),
      ])
    } finally {
      clearTimeout(timeoutHandle)
    }
  }
}
