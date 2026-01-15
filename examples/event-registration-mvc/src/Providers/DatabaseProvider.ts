import databaseConfig from '@config/database'
import { OrbitAtlas } from '@gravito/atlas'
import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'

export class DatabaseProvider extends ServiceProvider {
  register(container: Container): void {
    // OrbitAtlas is already registered by the orbit system
    // No need to register it again here
  }

  async boot(core: PlanetCore): Promise<void> {
    // Database is ready - OrbitAtlas handles connection automatically
  }
}
