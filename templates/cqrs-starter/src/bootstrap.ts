import { OrbitAtlas } from '@gravito/atlas'
import { defineConfig, PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'
import { OrbitSignal } from '@gravito/signal'
import { registerRoutes } from './routes'

/**
 * CQRS 應用 Bootstrap
 *
 * 基於 Command Query Responsibility Segregation 模式
 * 分離讀寫操作，提升高並發場景性能
 */
export async function bootstrap(port = 3000) {
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: 'CQRS Application',
    },
    orbits: [OrbitPrism, OrbitAtlas, OrbitSignal],
  })

  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  await registerRoutes(core)

  return { core }
}
