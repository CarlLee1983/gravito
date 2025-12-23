import type { CacheManager } from '@gravito/stasis'
import type { GravitoOrbit, PlanetCore } from 'gravito-core'
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
      const cacheManager = core.services.get('cache') as CacheManager | undefined

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

    core.services.set(exposeAs, scheduler)

    core.adapter.use('*', async (c: any, next) => {
      c.set('scheduler', scheduler)
      await next()
      return undefined
    })

    core.logger.info(`[OrbitHorizon] Initialized (Driver: ${lockDriver})`)
  }
}
