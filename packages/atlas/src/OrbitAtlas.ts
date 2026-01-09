import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { DB } from './DB'
import type { ConnectionConfig } from './types'

export class OrbitAtlas implements GravitoOrbit {
  async install(core: PlanetCore): Promise<void> {
    const config = core.config.get<{
      default?: string
      connections: Record<string, ConnectionConfig>
    }>('database')

    if (!config) {
      core.logger.warn('[OrbitAtlas] No database configuration found.')
      return
    }

    DB.configure(config)
    core.logger.info('[OrbitAtlas] Database configured.')
  }
}
