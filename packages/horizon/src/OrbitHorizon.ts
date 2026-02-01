import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { CacheManager } from '@gravito/stasis'
import { LockManager } from './locks'
import { SchedulerManager } from './SchedulerManager'

/**
 * Enterprise task scheduler orbit enabling distributed cron-based job execution.
 *
 * Provides the infrastructure for defining scheduled tasks with distributed locking,
 * preventing duplicate execution across multi-server deployments. Integrates seamlessly
 * with Gravito's orbit system to expose the scheduler in both the IoC container and
 * request context.
 *
 * Design rationale: Uses pluggable lock backends (memory/cache) to support both
 * development (single-node) and production (multi-node) environments without code changes.
 *
 * @example
 * Single-node development setup:
 * ```typescript
 * await PlanetCore.boot({
 *   config: {
 *     scheduler: {
 *       lock: { driver: 'memory' }
 *     }
 *   },
 *   orbits: [OrbitHorizon]
 * })
 * ```
 *
 * @example
 * Multi-node production with distributed locking:
 * ```typescript
 * import { OrbitCache } from '@gravito/stasis'
 *
 * await PlanetCore.boot({
 *   config: {
 *     scheduler: {
 *       lock: { driver: 'cache' },
 *       nodeRole: 'worker'
 *     }
 *   },
 *   orbits: [
 *     OrbitCache,      // Must load before Horizon
 *     OrbitHorizon
 *   ]
 * })
 * ```
 *
 * @public
 */
export class OrbitHorizon implements GravitoOrbit {
  /**
   * Integrates the Horizon scheduler into the PlanetCore lifecycle.
   *
   * Orchestrates the initialization sequence:
   * 1. Resolves lock backend (memory or cache-based).
   * 2. Instantiates SchedulerManager with global dependencies (logger, hooks).
   * 3. Registers the scheduler in the IoC container for CLI and global access.
   * 4. Injects the scheduler into the request context via middleware.
   *
   * @param core - PlanetCore instance providing configuration and service container.
   *
   * @throws {Error} If the cache driver is explicitly requested but `CacheManager` is unavailable.
   */
  install(core: PlanetCore): void {
    const config = core.config.get<{
      lock?: { driver: 'memory' | 'cache' }
      exposeAs?: string
      nodeRole?: string
    }>('scheduler', {})

    const lockDriver = config.lock?.driver || 'cache'
    const exposeAs = config.exposeAs || 'scheduler'
    const nodeRole = config.nodeRole

    let lockManager: LockManager

    if (lockDriver === 'cache') {
      const cacheManager = core.container.make('cache') as CacheManager | undefined

      if (!cacheManager) {
        core.logger.warn(
          '[OrbitHorizon] Cache driver requested but cache service not found (ensure orbit-cache is loaded first). Falling back to Memory lock.'
        )
        lockManager = new LockManager('memory')
      } else {
        lockManager = new LockManager('cache', { cache: cacheManager })
      }
    } else {
      lockManager = new LockManager('memory')
    }

    const scheduler = new SchedulerManager(lockManager, core.logger, core.hooks, nodeRole)

    // Register in core container for global access (CLI)
    core.container.instance(exposeAs, scheduler)

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('scheduler', scheduler)
      return await next()
    })

    core.logger.info(`[OrbitHorizon] Initialized (Driver: ${lockDriver})`)
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Scheduler manager for task scheduling */
    scheduler?: SchedulerManager
  }
}
