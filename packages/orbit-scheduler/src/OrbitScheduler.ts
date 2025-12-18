import type { CacheManager } from '@gravito/orbit-cache'
import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { LockManager } from './locks'
import { SchedulerManager } from './SchedulerManager'

export class OrbitScheduler implements GravitoOrbit {
  install(core: PlanetCore): void {
    const config = core.config.get<{
      lock?: { driver: 'memory' | 'cache' }
      exposeAs?: string
    }>('scheduler', {})

    const lockDriver = config.lock?.driver || 'cache'
    const exposeAs = config.exposeAs || 'scheduler'

    let lockManager: LockManager

    if (lockDriver === 'cache') {
      const cacheManager = core.services.get('cache') as CacheManager | undefined

      if (!cacheManager) {
        core.logger.warn(
          '[OrbitScheduler] Cache driver requested but cache service not found (ensure orbit-cache is loaded first). Falling back to Memory lock.'
        )
        lockManager = new LockManager('memory')
      } else {
        lockManager = new LockManager('cache', { cache: cacheManager })
      }
    } else {
      lockManager = new LockManager('memory')
    }

    const scheduler = new SchedulerManager(lockManager, core.logger, core.hooks)

    core.services.set(exposeAs, scheduler)

    core.app.use('*', async (c, next) => {
      // @ts-expect-error
      c.set('scheduler', scheduler)
      await next()
    })

    core.logger.info(`[OrbitScheduler] Initialized (Driver: ${lockDriver})`)
  }
}
