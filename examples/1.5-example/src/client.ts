import { createGravitoClient, type GravitoClientOptions } from '@gravito/client'
import type { AppRoutes } from './types'

/**
 * Create a type-safe API client.
 *
 * This function uses `@gravito/client` to create a Hono Client instance with full TypeScript
 * inference. Frontend projects can call APIs via this client and get end-to-end type safety.
 *
 * @param baseUrl - API base URL
 * @param options - Optional client options
 * @returns Type-safe Hono Client instance
 */
export const createClient = (baseUrl: string, options?: GravitoClientOptions) => {
  return createGravitoClient<AppRoutes>(baseUrl, options)
}
