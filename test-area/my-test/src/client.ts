import { createGravitoClient } from '@gravito/client'
import type { AppRoutes } from './types'

/**
 * Create a type-safe API client.
 *
 * This function uses `@gravito/client` to create a Photon Client instance with full TypeScript
 * inference. Frontend projects can call APIs via this client and get end-to-end type safety.
 *
 * @param baseUrl - API base URL
 * @param options - Optional fetch options (headers, credentials, etc.)
 * @returns Type-safe Photon Client instance
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
  return createGravitoClient<AppRoutes>(baseUrl, options)
}
