/**
 * Deno runtime adapter implementation.
 *
 * @module runtime/adapter-deno
 * @since 3.2.0
 */
import type { RuntimeAdapter } from './types'
/**
 * Create a RuntimeAdapter for the Deno runtime.
 * @internal
 */
export declare function createDenoAdapter(): RuntimeAdapter
