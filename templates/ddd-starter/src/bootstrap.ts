import { OrbitAtlas } from '@gravito/atlas'
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'
import { OrbitSignal } from '@gravito/signal'
import { registerRoutes } from './routes'

/**
 * DDD 應用 Bootstrap
 *
 * 基於 Domain-Driven Design 模式
 * 四層架構：Domain → Application → Infrastructure → Presentation
 */
export async function bootstrap(port = 3000) {
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: 'DDD Application',
    },
    orbits: [OrbitPrism, OrbitAtlas, OrbitSignal],
  })

  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  await registerRoutes(core)

  return { core }
}
