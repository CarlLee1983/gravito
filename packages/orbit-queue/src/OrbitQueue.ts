import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import type { ConsumerOptions } from './Consumer'
import { Consumer } from './Consumer'
import { QueueManager } from './QueueManager'
import type { QueueConfig } from './types'

/**
 * Orbit Queue configuration options.
 */
export interface OrbitQueueOptions extends QueueConfig {
  /**
   * Whether to auto-start an embedded worker in development.
   */
  autoStartWorker?: boolean

  /**
   * Embedded worker options.
   */
  workerOptions?: ConsumerOptions
}

/**
 * Orbit Queue
 *
 * Gravito Orbit implementation providing queue functionality.
 * Integrates with PlanetCore and injects a `queue` service into the Hono Context.
 *
 * @example
 * ```typescript
 * const core = await PlanetCore.boot({
 *   orbits: [
 *     OrbitQueue.configure({
 *       default: 'database',
 *       connections: {
 *         database: { driver: 'database', table: 'jobs' }
 *       }
 *     })
 *   ]
 * })
 *
 * // Use in a controller/handler
 * const queue = c.get('queue')
 * await queue.push(new SendEmail('user@example.com'))
 * ```
 */
export class OrbitQueue implements GravitoOrbit {
  private queueManager?: QueueManager
  private consumer?: Consumer

  constructor(private options: OrbitQueueOptions = {}) {}

  /**
   * Static configuration helper.
   */
  static configure(options: OrbitQueueOptions): OrbitQueue {
    return new OrbitQueue(options)
  }

  /**
   * Install into PlanetCore.
   */
  install(core: PlanetCore): void {
    // Create QueueManager.
    // Note: for the database driver, dbService can be resolved dynamically from Context on first request.
    this.queueManager = new QueueManager(this.options)

    // Inject queue service into Context.
    // If a database connection is configured without dbService, it will be resolved from Context on first use.
    core.app.use('*', async (c, next) => {
      // Resolve dbService dynamically for database connections
      if (this.queueManager && this.options.connections) {
        for (const [name, config] of Object.entries(this.options.connections)) {
          if (
            (config as { driver: string }).driver === 'database' &&
            !(config as { dbService?: unknown }).dbService
          ) {
            try {
              // Try to get dbService from Context
              const dbService = c.get('db')
              if (dbService) {
                // Check whether the driver is already registered
                try {
                  this.queueManager.getDriver(name)
                } catch {
                  // Not registered yet: register now
                  this.queueManager.registerConnection(name, {
                    ...config,
                    dbService,
                  })
                }
              }
            } catch {
              // db service not present: ignore (OrbitDB may not be installed)
            }
          }
        }
      }

      c.set('queue', this.queueManager!)
      await next()
    })

    core.logger.info('[OrbitQueue] Installed')

    // Auto-start embedded worker in development (optional)
    if (
      this.options.autoStartWorker &&
      process.env.NODE_ENV === 'development' &&
      this.options.workerOptions
    ) {
      this.startWorker(this.options.workerOptions)
    }
  }

  /**
   * Start embedded worker.
   */
  startWorker(options: ConsumerOptions): void {
    if (!this.queueManager) {
      throw new Error('QueueManager not initialized. Call install() first.')
    }

    if (this.consumer?.isRunning()) {
      throw new Error('Worker is already running')
    }

    this.consumer = new Consumer(this.queueManager, options)
    this.consumer.start().catch((error) => {
      console.error('[OrbitQueue] Worker error:', error)
    })
  }

  /**
   * Stop embedded worker.
   */
  async stopWorker(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop()
    }
  }

  /**
   * Get QueueManager instance.
   */
  getQueueManager(): QueueManager | undefined {
    return this.queueManager
  }
}

// Module augmentation for Hono (backward compatibility)
declare module 'hono' {
  interface ContextVariableMap {
    queue: QueueManager
    db?: unknown
  }
}

// Module augmentation for GravitoVariables (new abstraction)
declare module 'gravito-core' {
  interface GravitoVariables {
    /** Queue manager for job processing */
    queue?: QueueManager
    /** Database service (from orbit-db) */
    db?: unknown
  }
}
