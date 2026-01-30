import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { DB } from './DB'
import type { AtlasConfig } from './types'

/**
 * Atlas Orbit - Database & ORM Integration
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
  }
}
