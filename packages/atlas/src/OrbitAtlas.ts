import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { DB } from './DB'
import type { AtlasConfig } from './types'

/**
 * Atlas Orbit - Database & ORM Integration.
 * Integrates the Atlas ORM engine into the Gravito Core ecosystem.
 * @public
 */
export class OrbitAtlas implements GravitoOrbit {
  async install(core: PlanetCore): Promise<void> {
    const config = core.config.get<AtlasConfig>('database')

    if (!config) {
      core.logger.warn('[OrbitAtlas] No database configuration found.')
      return
    }

    DB.configure(config)
    core.logger.info('[OrbitAtlas] Database configured.')

    // Register shutdown hook with 5s deadline (D-09: atlas = 5s)
    core.hooks.doAction('core:shutdown', async () => {
      const DEADLINE_MS = 5000
      const deadline = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('[OrbitAtlas] Shutdown deadline exceeded (5s)')), DEADLINE_MS)
      )
      try {
        await Promise.race([DB.shutdown(), deadline])
      } catch (err) {
        core.logger.warn('[OrbitAtlas] Forced shutdown:', err)
      }
    })
  }
}
