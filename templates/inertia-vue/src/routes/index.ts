import type { PlanetCore } from '@gravito/core'
import { ApiController } from '../controllers/ApiController'
import { HomeController } from '../controllers/HomeController'

export function registerRoutes(core: PlanetCore): void {
  const router = core.router

  router.get('/', [HomeController, 'index'])
  router.get('/about', [HomeController, 'about'])

  router.prefix('/api').group((api) => {
    api.get('/health', [ApiController, 'health'])
  })
}
