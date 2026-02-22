import { PlanetCore } from '@gravito/core'
import { HomeController } from './Http/Controllers/HomeController'
import { AuthController } from './Http/Controllers/AuthController'
import { AuthMiddleware } from './Http/Middleware/AuthMiddleware'
import { GuestMiddleware } from './Http/Middleware/GuestMiddleware'

export async function registerRoutes(core: PlanetCore) {
  // Guest routes
  core.get('/', (ctx) => new HomeController().index(ctx))
  
  // Auth routes
  core.get('/login', (ctx) => new AuthController().showLogin(ctx), [GuestMiddleware])
  core.post('/login', (ctx) => new AuthController().login(ctx), [GuestMiddleware])
  core.get('/register', (ctx) => new AuthController().showRegister(ctx), [GuestMiddleware])
  core.post('/register', (ctx) => new AuthController().register(ctx), [GuestMiddleware])

  // Protected routes
  core.post('/logout', (ctx) => new AuthController().logout(ctx), [AuthMiddleware])
  core.get('/dashboard', (ctx) => new HomeController().dashboard(ctx), [AuthMiddleware])
}
