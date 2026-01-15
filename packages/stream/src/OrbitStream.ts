import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { ConsumerOptions } from './Consumer'
import { Consumer } from './Consumer'
import { QueueManager } from './QueueManager'
import type { QueueConfig } from './types'

/**
 * Orbit Queue configuration options.
 */
export interface OrbitStreamOptions extends QueueConfig {
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
 */
export class OrbitStream implements GravitoOrbit {
  private queueManager?: QueueManager
  private consumer?: Consumer

  constructor(private options: OrbitStreamOptions = {}) {}

  /**
   * Static configuration helper.
   */
  static configure(options: OrbitStreamOptions): OrbitStream {
    return new OrbitStream(options)
  }

  /**
   * Install into PlanetCore.
   */
  install(core: PlanetCore): void {
    // Create QueueManager.
    this.queueManager = new QueueManager(this.options)

    // Register in core container for global access (CLI, Jobs)
    core.container.instance('queue', this.queueManager)

    // Inject queue service into Context.
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
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
      return await next()
    })

    core.logger.info('[OrbitStream] Installed')

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
      console.error('[OrbitStream] Worker error:', error)
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

// Module augmentation for GravitoVariables (new abstraction)
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Queue manager for job processing */
    queue?: QueueManager
    /** Database service (from orbit-db) */
    db?: unknown
  }
}
