import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { CacheManager } from '@gravito/stasis'
import { LockManager } from './locks'
import { SchedulerManager } from './SchedulerManager'

export class OrbitHorizon implements GravitoOrbit {
  /**
   * Install the Horizon Orbit into PlanetCore.
   *
   * @param core - The PlanetCore instance.
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
