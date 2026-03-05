import { OrbitAtlas } from '@gravito/atlas'
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'
import { OrbitSignal } from '@gravito/signal'
import { registerRoutes } from './routes'

/**
 * DDD 應用 Bootstrap
 *
 * 基於 Domain-Driven Design 模式
 * 極簡 base：入口、路由、health/API，之後可擴充 Modules/Shared
 */
export async function bootstrap(port = 3000) {
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: 'station-ddd',
    },
    orbits: [OrbitPrism, OrbitAtlas, OrbitSignal],
  })

  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  await registerRoutes(core)

  return { core }
}
