import type { Env, Hono, Schema } from 'hono'
import { hc } from 'hono/client'
import type { BeamOptions } from './types'

/**
 * Orbit Beam - Lightweight type-safe RPC client for Gravito applications.
 *
 * This function wraps the Hono client (`hc`) to provide a seamless, type-safe development experience
 * similar to tRPC but with zero runtime overhead. It directly delegates to Hono's client, maintaining
 * maximum performance and minimal bundle size.
 *
 * **Zero Runtime Overhead**: This is a pure type wrapper that delegates directly to `hc<T>`.
 * No additional abstraction layers or middleware are added.
 *
 * **Type Support**: Supports both `AppType` (simple Hono instance) and `AppRoutes` (from `app.route()`).
 * Both are Hono instances and work seamlessly with this function.
 *
 * @template T - The type of your Hono app. Can be either:
 *   - `AppType`: `typeof app` - Direct type from Hono instance (simple scenarios)
 *   - `AppRoutes`: `ReturnType<typeof _createTypeOnlyApp>` - Type from `app.route()` chain (recommended, matches template usage)
 * @param baseUrl - The base URL of your API server (e.g., 'http://localhost:3000')
 * @param options - Optional configuration including fetch options (headers, etc.)
 * @returns A fully typed Hono client instance that provides IntelliSense for all routes
 *
 * @example
 * **Using AppType (simple scenario):**
 * ```typescript
 * // server/app.ts
 * const app = new Hono()
 *   .post('/post', validate('json', PostSchema), (c) => {
 *     return c.json({ id: 1, title: 'Hello' })
 *   })
 *
 * export type AppType = typeof app
 *
 * // client.ts
 * import { createBeam } from '@gravito/beam'
 * import type { AppType } from '../server/app'
 *
 * const client = createBeam<AppType>('http://localhost:3000')
 *
 * // Fully typed request - TypeScript will autocomplete and validate
 * const res = await client.post.$post({
 *   json: { title: 'Gravito' } // ✅ Type checked!
 * })
 * ```
 *
 * @example
 * **Using AppRoutes (recommended, matches template usage):**
 * ```typescript
 * // server/app.ts
 * const routes = app
 *   .route('/api/users', userRoute)
 *   .route('/api', apiRoute)
 *
 * export type AppRoutes = typeof routes
 *
 * // client.ts
 * import { createBeam } from '@gravito/beam'
 * import type { AppRoutes } from '../server/types'
 *
 * const client = createBeam<AppRoutes>('http://localhost:3000')
 *
 * // Fully typed request with nested routes
 * const res = await client.api.users.login.$post({
 *   json: { username: 'user', password: 'pass' } // ✅ Type checked!
 * })
 * ```
 */
export function createBeam<T extends Hono<Env, Schema, string>>(
  baseUrl: string,
  options?: BeamOptions
): ReturnType<typeof hc<T>> {
  // We explicitly cast the return type to match what hc<T> provides.
  // The 'hc' function from Hono returns a proxy that provides typed access based on T.
  return hc<T>(baseUrl, options)
}

/**
 * Backward compatible alias for createBeam
 * @deprecated Use createBeam instead
 */
export const createGravitoClient = createBeam

export type { BeamOptions, BeamOptions as GravitoClientOptions } from './types'
