import type { Env, Photon, Schema } from '@gravito/photon'
import { hc as beamClient } from '@gravito/photon/client'
import type { BeamOptions } from './types'

/**
 * Orbit Beam - Lightweight type-safe RPC client for Gravito applications.
 *
 * This function wraps the Beam client to provide a seamless, type-safe development experience
 * similar to tRPC but with zero runtime overhead. It directly delegates to the Photon client, maintaining
 * maximum performance and minimal bundle size.
 *
 * **Zero Runtime Overhead**: This is a pure type wrapper that delegates directly to the Beam client.
 * No additional abstraction layers or middleware are added.
 *
 * **Type Support**: Supports both `AppType` (simple Photon instance) and `AppRoutes` (from `app.route()`).
 * Both are Photon instances and work seamlessly with this function.
 *
 * @template T - The type of your Photon app. Can be either:
 *   - `AppType`: `typeof app` - Direct type from Photon instance (simple scenarios)
 *   - `AppRoutes`: `ReturnType<typeof _createTypeOnlyApp>` - Type from `app.route()` chain (recommended, matches template usage)
 * @param baseUrl - The base URL of your API server (e.g., 'http://localhost:3000')
 * @param options - Optional configuration including fetch options (headers, etc.)
 * @returns A fully typed Beam client instance that provides IntelliSense for all routes
 *
 * @example
 * **Using AppType (simple scenario):**
 * ```typescript
 * // server/app.ts
 * const app = new Photon()
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
export function createBeam<T extends Photon<Env, Schema, string>>(
  baseUrl: string,
  options?: BeamOptions
): ReturnType<typeof beamClient<T>> {
  // We explicitly cast the return type to match what the Beam client provides.
  // The Photon client returns a proxy that provides typed access based on T.
  return beamClient<T>(baseUrl, options)
}

/**
 * Backward compatible alias for createBeam
 * @deprecated Use createBeam instead
 */
export const createGravitoClient = createBeam

export type { BeamOptions, BeamOptions as GravitoClientOptions } from './types'
