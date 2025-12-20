import type { PlanetCore } from 'gravito-core'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { logger } from 'hono/logger'
import { apiRoute } from './routes/api'
import { createPagesRoute } from './routes/pages'
import { userRoute } from './routes/user'

/**
 * Create the main application.
 *
 * Important: you must use `app.route()` to compose route modules so that Hono can infer a complete
 * API tree type for the frontend.
 *
 * @param core - PlanetCore instance (pages routes may need access to core dependencies)
 * @returns App instance and inferred routes type
 *
 * @example
 * ```typescript
 * // ✅ Correct: use `app.route()` for composition
 * const routes = app.route('/api/users', userRoute)
 *
 * // ❌ Incorrect: direct mounting prevents type inference
 * app.use('/api/users', userRoute)
 * ```
 */
export function createApp(core: PlanetCore) {
  const app = new Hono()

  // Global middleware
  app.use('*', logger())

  // Static assets
  app.use('/static/*', serveStatic({ root: './' }))
  app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }))

  // Create pages routes
  const pagesRoute = createPagesRoute(core)

  // Compose routes using `app.route()` to preserve full TypeScript inference.
  const routes = app.route('/', pagesRoute).route('/api/users', userRoute).route('/api', apiRoute)

  return { app, routes }
}

/**
 * For type inference, we create a complete route structure.
 * This type is exported for the frontend to get full type hints.
 *
 * Note: this instance is for types only; the real app is created in bootstrap.
 * Pages routes need `core`, so they are not included here, but API routes are sufficient for most
 * frontend usage.
 */
function _createTypeOnlyApp() {
  const app = new Hono()
  const routes = app.route('/api/users', userRoute).route('/api', apiRoute)
  return routes
}

// Export routes type for `types.ts`. This includes full type information for all API routes.
export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>
