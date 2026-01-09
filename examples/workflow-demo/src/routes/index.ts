import type { PlanetCore } from '@gravito/core'
import { AuthController } from '../controllers/AuthController'
import { HomeController } from '../controllers/HomeController'
import { ProductController } from '../controllers/ProductController'
import { ProfileController } from '../controllers/ProfileController'
import { SettingsController } from '../controllers/SettingsController'

export function registerRoutes(core: PlanetCore) {
  const router = core.router
  const homeController = new HomeController()
  const authController = new AuthController()
  const profileController = new ProfileController()
  const settingsController = new SettingsController()
  const productController = new ProductController()

  router.get('/', homeController.dashboard)
  router.get('/health', homeController.health)

  router.post('/auth/login', authController.login)
  router.post('/auth/register', authController.register)

  router.middleware(authController.requireAuth).group((protectedRoutes) => {
    protectedRoutes.get('/profile', profileController.show)
    protectedRoutes.put('/profile', profileController.update)
    protectedRoutes.get('/settings', settingsController.index)
    protectedRoutes.put('/settings', settingsController.update)
    protectedRoutes.get('/products', productController.index)
    protectedRoutes.post('/products', productController.create)
    protectedRoutes.put('/products/:id', productController.update)
    protectedRoutes.delete('/products/:id', productController.destroy)
  })
}
