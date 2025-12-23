import { type BeamOptions, createBeam } from '@gravito/beam'
import type { AppRoutes } from './types'

/**
 * Create a type-safe API client (Orbit Beam).
 *
 * This function uses `@gravito/beam` to create a Hono Client instance with full TypeScript
 * inference. Frontend projects can call APIs via this client and get end-to-end type safety.
 *
 * @param baseUrl - API base URL
 * @param options - Optional client options
 * @returns Type-safe Hono Client instance
 */
export const createClient = (baseUrl: string, options?: BeamOptions) => {
  return createBeam<AppRoutes>(baseUrl, options)
}
