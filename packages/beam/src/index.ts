import type { Env, Photon, Schema } from '@gravito/photon'
import { hc as beamClient } from '@gravito/photon/client'
import type { BeamOptions } from './types'

/**
 * Orbit Beam - Lightweight type-safe RPC client for Gravito applications.
 *
 * This function creates a type-safe API client by wrapping the underlying Beam client.
 * It provides a seamless development experience similar to tRPC but with **zero runtime overhead**.
 * The client directly delegates to Photon's high-performance HTTP engine.
 *
 * ### Key Features
 * - **Zero Runtime Overhead**: Pure type wrapper, no additional abstraction layers.
 * - **Type Safety**: Automatically infers types from your backend `AppType` or `AppRoutes`.
 * - **IntelliSense**: Full autocomplete for routes, methods, and request/response bodies.
 *
 * @template T - The generic type parameter representing your Photon app or routes.
 *   - `AppType`: `typeof app` - For direct route definitions.
 *   - `AppRoutes`: `ReturnType<typeof createApp>` - For modular app.route() chains.
 *
 * @param baseUrl - The root URL of your API server (e.g., `'http://localhost:3000'`).
 * @param options - Optional configuration for the client (headers, credentials, etc.).
 * @returns A fully typed Beam client proxy for your API.
 *
 * @example
 * ```typescript
 * import { createBeam } from '@gravito/beam'
 * import type { AppType } from './server'
 *
 * const client = createBeam<AppType>('http://localhost:3000')
 *
 * // Fully typed GET request
 * const res = await client.hello.$get()
 * const data = await res.json()
 * ```
 *
 * @public
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
 * Backward compatible alias for {@link createBeam}.
 *
 * @deprecated Use {@link createBeam} instead. This alias will be removed in future versions.
 * @public
 */
export const createGravitoClient = createBeam

export type { BeamOptions, BeamOptions as GravitoClientOptions } from './types'
