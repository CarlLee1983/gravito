import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { FluxEngine } from '../engine/FluxEngine'
import { BunSQLiteStorage } from '../storage/BunSQLiteStorage'
import { MemoryStorage } from '../storage/MemoryStorage'
import type { FluxConfig, FluxLogger, WorkflowStorage } from '../types'

/**
 * Configuration options for the OrbitFlux extension.
 *
 * Defines how the workflow engine should be initialized and integrated into the Gravito core.
 */
export interface OrbitFluxOptions {
  /**
   * Specifies the storage driver to use for persisting workflow states.
   *
   * - 'memory': Volatile in-memory storage (default).
   * - 'sqlite': Persistent SQLite storage (Bun only).
   * - WorkflowStorage: A custom implementation of the storage interface.
   */
  storage?: 'memory' | 'sqlite' | WorkflowStorage

  /**
   * The file system path for the SQLite database.
   *
   * Only applicable when `storage` is set to 'sqlite'.
   */
  dbPath?: string

  /**
   * The key under which the FluxEngine will be registered in the core service container.
   */
  exposeAs?: string

  /**
   * A custom logger implementation for the workflow engine.
   *
   * If not provided, the engine will use a wrapper around the core logger.
   */
  logger?: FluxLogger

  /**
   * The default number of times a workflow step should be retried upon failure.
   */
  defaultRetries?: number

  /**
   * The default timeout in milliseconds for workflow steps.
   */
  defaultTimeout?: number
}

/**
 * OrbitFlux integrates the Flux workflow engine into the Gravito Galaxy Architecture.
 *
 * It acts as an "Orbit" (infrastructure extension) that provides a managed `FluxEngine`
 * instance to the core application and other satellites. It also bridges engine events
 * to the core hook system.
 *
 * @example
 * ```typescript
 * import { OrbitFlux } from '@gravito/flux'
 *
 * const core = await PlanetCore.boot({
 *   orbits: [
 *     new OrbitFlux({
 *       storage: 'sqlite',
 *       dbPath: './data/workflows.db'
 *     })
 *   ]
 * })
 *
 * // Access the engine from the container
 * const flux = core.container.make<FluxEngine>('flux')
 * ```
 */
export class OrbitFlux implements GravitoOrbit {
  private options: OrbitFluxOptions
  private engine?: FluxEngine

  /**
   * Initializes a new OrbitFlux instance with the given options.
   *
   * @param options - Configuration for the workflow engine integration.
   */
  constructor(options: OrbitFluxOptions = {}) {
    this.options = {
      storage: 'memory',
      exposeAs: 'flux',
      defaultRetries: 3,
      defaultTimeout: 30000,
      ...options,
    }
  }

  /**
   * Static factory method to create and configure an OrbitFlux instance.
   *
   * @param options - Configuration for the workflow engine integration.
   * @returns A configured OrbitFlux instance.
   */
  static configure(options: OrbitFluxOptions = {}): OrbitFlux {
    return new OrbitFlux(options)
  }

  /**
   * Installs the Flux workflow engine into the Gravito core.
   *
   * This method resolves the storage adapter, initializes it, configures the engine
   * with core-integrated logging and hooks, and registers the engine in the IoC container.
   *
   * @param core - The PlanetCore instance being booted.
   * @throws {Error} If storage initialization fails or engine registration conflicts occur.
   */
  async install(core: PlanetCore): Promise<void> {
    const { storage, dbPath, exposeAs, defaultRetries, defaultTimeout, logger } = this.options

    // Resolve storage adapter
    let storageAdapter: WorkflowStorage

    if (typeof storage === 'string') {
      switch (storage) {
        case 'sqlite':
          storageAdapter = new BunSQLiteStorage({ path: dbPath })
          break
        default:
          storageAdapter = new MemoryStorage()
      }
    } else {
      storageAdapter = storage!
    }

    // Initialize storage
    await storageAdapter.init?.()

    // Create engine configuration
    const engineConfig: FluxConfig = {
      storage: storageAdapter,
      defaultRetries,
      defaultTimeout,
      logger: logger ?? {
        debug: (msg) => core.logger.debug(`[Flux] ${msg}`),
        info: (msg) => core.logger.info(`[Flux] ${msg}`),
        warn: (msg) => core.logger.warn(`[Flux] ${msg}`),
        error: (msg) => core.logger.error(`[Flux] ${msg}`),
      },
      on: {
        stepStart: (step) => {
          core.hooks.doAction('flux:step:start', { step })
        },
        stepComplete: (step, ctx, result) => {
          core.hooks.doAction('flux:step:complete', { step, ctx, result })
        },
        stepError: (step, ctx, error) => {
          core.hooks.doAction('flux:step:error', { step, ctx, error })
        },
        workflowComplete: (ctx) => {
          core.hooks.doAction('flux:workflow:complete', { ctx })
        },
        workflowError: (ctx, error) => {
          core.hooks.doAction('flux:workflow:error', { ctx, error })
        },
      },
    }

    // Create engine
    this.engine = new FluxEngine(engineConfig)

    // Register in core container
    core.container.instance(exposeAs!, this.engine)

    core.logger.info(
      `[OrbitFlux] Initialized (Storage: ${typeof storage === 'string' ? storage : 'custom'})`
    )
  }

  /**
   * Retrieves the managed FluxEngine instance.
   *
   * @returns The FluxEngine instance, or undefined if the orbit has not been installed.
   */
  getEngine(): FluxEngine | undefined {
    return this.engine
  }

  /**
   * Performs cleanup operations when the core is shutting down.
   *
   * Closes the underlying workflow engine and its storage connections.
   *
   * @throws {Error} If the engine fails to close cleanly.
   */
  async cleanup(): Promise<void> {
    if (this.engine) {
      await this.engine.close()
    }
  }
}
