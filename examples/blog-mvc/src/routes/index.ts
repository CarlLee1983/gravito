import type { GravitoContext, PlanetCore } from '@gravito/core'
import { AdminController } from '../controllers/AdminController'
import { AuthController } from '../controllers/AuthController'
import { BlogController } from '../controllers/BlogController'
import { authMiddleware } from '../middleware/AuthMiddleware'

export async function registerRoutes(core: PlanetCore) {
  const blog = new BlogController()
  const auth = new AuthController()
  const admin = new AdminController()

  // 1. Web Routes
  core.adapter.route('get', '/', (c: GravitoContext) => blog.index(c))
  core.adapter.route('get', '/posts/:slug', (c: GravitoContext) => blog.show(c))

  // 2. Auth Routes
  core.adapter.route('get', '/login', (c: GravitoContext) => auth.showLogin(c))
  core.adapter.route('post', '/login', (c: GravitoContext) => auth.login(c))
  core.adapter.route('post', '/logout', (c: GravitoContext) => auth.logout(c))

  // 3. Admin Routes (Protected)
  core.adapter.use('/admin/*', authMiddleware)
  core.adapter.route('get', '/admin/dashboard', (c: GravitoContext) => admin.dashboard(c))
  core.adapter.route('get', '/admin/posts/create', (c: GravitoContext) => admin.create(c))
  core.adapter.route('post', '/admin/posts', (c: GravitoContext) => blog.store(c))
  core.adapter.route('get', '/admin/posts/:id/edit', (c: GravitoContext) => admin.edit(c))
  core.adapter.route('put', '/admin/posts/:id', (c: GravitoContext) => blog.update(c))
  core.adapter.route('delete', '/admin/posts/:id', (c: GravitoContext) => blog.destroy(c))
}
