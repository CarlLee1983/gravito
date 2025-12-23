import { createBeam } from '@gravito/beam'
import type { AppRoutes } from './types'

/**
 * Create a type-safe API client (Orbit Beam).
 *
 * This function uses `@gravito/beam` to create a Hono Client instance with full TypeScript
 * inference. Frontend projects can call APIs via this client and get end-to-end type safety.
 *
 * @param baseUrl - API base URL
 * @param options - Optional fetch options (headers, credentials, etc.)
 * @returns Type-safe Hono Client instance
 *
 * @example
 * ```typescript
 * // Browser usage
 * import { createClient } from './client'
 *
 * const client = createClient('http://localhost:3000')
 *
 * // Full type inference
 * const result = await client.api.users.login.$post({
 *   json: {
 *     username: 'user',
 *     password: 'pass'
 *   }
 * })
 *
 * // `result` is automatically inferred
 * if (result.ok) {
 *   const data = await result.json()
 *   console.log(data.success) // ✅ Type-safe
 * }
 * ```
 */
export const createClient = (baseUrl: string, options?: RequestInit) => {
  return createBeam<AppRoutes>(baseUrl, options)
}
