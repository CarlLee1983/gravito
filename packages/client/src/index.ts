import type { Hono } from 'hono'
import { hc } from 'hono/client'
import type { GravitoClientOptions } from './types'

/**
 * Creates a type-safe API client for Gravito applications.
 *
 * This function wraps the Hono client to provide a seamless, type-safe development experience.
 * It strictly types the client based on your backend AppType.
 *
 * @template T - The type of your Hono app (e.g., `AppType` exported from backend)
 * @param baseUrl - The base URL of your API server (e.g., 'http://localhost:3000')
 * @param options - Optional configuration including fetch options
 *
 * @example
 * ```typescript
 * import { createGravitoClient } from '@gravito/client'
 * import type { AppType } from '../server/app'
 *
 * const client = createGravitoClient<AppType>('http://localhost:3000')
 *
 * // Fully typed request
 * const response = await client.posts.$post({ json: { title: 'Hello' } })
 * ```
 */
export function createGravitoClient<T extends Hono<any, any, any>>(
  baseUrl: string,
  options?: GravitoClientOptions
) {
  // We explicitly cast the return type to match what hc<T> provides.
  // The 'hc' function from Hono returns a proxy that provides typed access based on T.
  return hc<T>(baseUrl, options)
}

export type { GravitoClientOptions } from './types'
