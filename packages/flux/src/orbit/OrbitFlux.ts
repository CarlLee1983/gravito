/**
 * @fileoverview OrbitFlux - Gravito PlanetCore Integration
 *
 * Integrates FluxEngine with Gravito's PlanetCore for seamless workflow management.
 *
 * @module @gravito/flux
 */

import { FluxEngine } from '../engine/FluxEngine'
import { BunSQLiteStorage } from '../storage/BunSQLiteStorage'
import { MemoryStorage } from '../storage/MemoryStorage'
import type { FluxConfig, FluxLogger, WorkflowStorage } from '../types'

/**
 * Minimal PlanetCore interface for type compatibility
 * (Avoids importing gravito-core sources which causes rootDir issues)
 */
interface PlanetCore {
  logger: {
    debug(message: string, ...args: unknown[]): void
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
  }
  services: {
    set(key: string, value: unknown): void
    get<T>(key: string): T | undefined
  }
  hooks: {
    doAction(name: string, payload?: unknown): void
  }
}

/**
 * GravitoOrbit interface
 */
export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}

/**
 * OrbitFlux configuration options
 */
export interface OrbitFluxOptions {
  /**
   * Storage driver: 'memory' | 'sqlite' | custom WorkflowStorage
   * @default 'memory'
   */
  storage?: 'memory' | 'sqlite' | WorkflowStorage

  /**
   * SQLite database path (only used if storage is 'sqlite')
   * @default ':memory:'
   */
  dbPath?: string

  /**
   * Service name in core.services
   * @default 'flux'
   */
  exposeAs?: string

  /**
   * Custom logger
   */
  logger?: FluxLogger

  /**
   * Default retry count for steps
   * @default 3
   */
  defaultRetries?: number

  /**
   * Default timeout for steps (ms)
   * @default 30000
   */
  defaultTimeout?: number
}

/**
 * OrbitFlux - Gravito Workflow Integration
 *
 * @example
 * ```typescript
 * import { OrbitFlux } from '@gravito/flux'
 *
 * const core = await PlanetCore.boot({
 *   orbits: [
 *     new OrbitFlux({ storage: 'sqlite', dbPath: './data/workflows.db' })
 *   ]
 * })
 *
 * // Access via services
 * const flux = core.services.get<FluxEngine>('flux')
 * await flux.execute(myWorkflow, input)
 * ```
 */
export class OrbitFlux implements GravitoOrbit {
  private options: OrbitFluxOptions
  private engine?: FluxEngine

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
   * Create OrbitFlux with configuration
   */
  static configure(options: OrbitFluxOptions = {}): OrbitFlux {
    return new OrbitFlux(options)
  }

  /**
   * Install into PlanetCore
   *
   * @param core - The PlanetCore instance
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
        case 'memory':
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

    // Register in core services
    core.services.set(exposeAs!, this.engine)

    core.logger.info(
      `[OrbitFlux] Initialized (Storage: ${typeof storage === 'string' ? storage : 'custom'})`
    )
  }

  /**
   * Get the FluxEngine instance
   */
  getEngine(): FluxEngine | undefined {
    return this.engine
  }
}
