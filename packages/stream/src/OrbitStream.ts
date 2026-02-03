import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { ConsumerOptions } from './Consumer'
import { Consumer } from './Consumer'
import { QueueManager } from './QueueManager'
import { StreamEventBackend } from './StreamEventBackend'
import type { QueueConfig } from './types'

/**
 * Configuration options for the OrbitStream extension.
 *
 * Extends the standard `QueueConfig` with specific options for integration into
 * the Gravito lifecycle, such as auto-starting workers in development environments.
 *
 * @public
 * @example
 * ```typescript
 * const options: OrbitStreamOptions = {
 *   default: 'redis',
 *   autoStartWorker: true
 * };
 * ```
 */
export interface OrbitStreamOptions extends QueueConfig {
  /**
   * Automatically start an embedded worker process.
   *
   * If set to `true`, a background worker will be spawned within the main process.
   * This is recommended for development or simple deployments but should be
   * avoided in high-scale production to keep web servers stateless.
   */
  autoStartWorker?: boolean

  /**
   * Configuration options for the embedded worker.
   *
   * Only used if `autoStartWorker` is true. Defines concurrency, polling intervals, etc.
   */
  workerOptions?: ConsumerOptions

  /**
   * Configuration for the Stream Monitoring Dashboard API.
   *
   * If enabled, registers API routes for monitoring queue health and job history.
   *
   * @default false
   */
  dashboard?:
    | boolean
    | {
        /**
         * Base path for the dashboard API routes.
         * @default '/_flux'
         */
        path?: string
      }
}

/**
 * The Queue Orbit (Plugin) for Gravito Framework.
 *
 * This class acts as the integration layer between the `@gravito/stream` package
 * and the Gravito core system (`PlanetCore`). It registers the `QueueManager`
 * service, injects it into the request context, and manages the lifecycle of
 * embedded workers.
 *
 * @public
 * @example
 * ```typescript
 * const stream = OrbitStream.configure({
 *   default: 'redis',
 *   connections: {
 *     redis: { driver: 'redis', client: redis }
 *   }
 * });
 *
 * await PlanetCore.boot({ orbits: [stream] });
 * ```
 */
export class OrbitStream implements GravitoOrbit {
  private queueManager?: QueueManager
  private consumer?: Consumer
  private core?: PlanetCore

  constructor(private options: OrbitStreamOptions = {}) {}

  /**
   * Factory method for creating and configuring an OrbitStream instance.
   *
   * Provides a fluent way to instantiate the orbit during application bootstrap.
   *
   * @param options - Configuration options.
   * @returns A new OrbitStream instance.
   *
   * @example
   * ```typescript
   * const orbit = OrbitStream.configure({ default: 'memory' });
   * ```
   */
  static configure(options: OrbitStreamOptions): OrbitStream {
    return new OrbitStream(options)
  }

  /**
   * Installs the Queue system into the Gravito PlanetCore.
   *
   * This lifecycle method:
   * 1. Initializes the `QueueManager`.
   * 2. Registers the `queue` service in the dependency injection container.
   * 3. Sets up a global middleware to inject `QueueManager` into the request context (`c.get('queue')`).
   * 4. Automatically detects and registers database connections if available in the context.
   * 5. Starts the embedded worker if configured.
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    this.core = core
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

    // Replace default event backend with Stream backend
    if (this.queueManager) {
      const backend = new StreamEventBackend(this.queueManager)
      core.hooks.setBackend(backend)
      core.logger.info('[OrbitStream] HookManager backend switched to StreamEventBackend')
    }

    if (this.options.dashboard) {
      const { DashboardProvider } = require('./DashboardProvider')
      const dashboard = new DashboardProvider(this.queueManager)
      const path =
        typeof this.options.dashboard === 'object' ? this.options.dashboard.path : '/_flux'
      dashboard.registerRoutes(core, path)
      core.logger.info(`[OrbitStream] Dashboard API registered at ${path}`)
    }

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
   * Starts the embedded worker process.
   *
   * Launches a `Consumer` instance to process jobs in the background.
   * Throws an error if `QueueManager` is not initialized or if a worker is already running.
   *
   * @param options - Consumer configuration options.
   * @throws {Error} If QueueManager is missing or worker is already active.
   *
   * @example
   * ```typescript
   * orbit.startWorker({ queues: ['default'] });
   * ```
   */
  startWorker(options: ConsumerOptions): void {
    if (!this.queueManager) {
      throw new Error('QueueManager not initialized. Call install() first.')
    }

    if (this.consumer?.isRunning()) {
      throw new Error('Worker is already running')
    }

    const consumerOptions: ConsumerOptions = {
      ...options,
      onEvent: (event, payload) => {
        const signal = this.core?.container.make('signal') as any
        if (signal && typeof signal.emit === 'function') {
          signal.emit(`stream:${event}`, payload)
        }
      },
    }

    this.consumer = new Consumer(this.queueManager, consumerOptions)
    this.consumer.start().catch((error: unknown) => {
      console.error('[OrbitStream] Worker error:', error)
    })
  }

  /**
   * Stops the embedded worker process.
   *
   * Gracefully shuts down the consumer, waiting for active jobs to complete.
   *
   * @returns A promise that resolves when the worker has stopped.
   *
   * @example
   * ```typescript
   * await orbit.stopWorker();
   * ```
   */
  async stopWorker(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop()
    }
  }

  /**
   * Retrieves the underlying QueueManager instance.
   *
   * @returns The active QueueManager, or undefined if not installed.
   *
   * @example
   * ```typescript
   * const manager = orbit.getQueueManager();
   * ```
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
