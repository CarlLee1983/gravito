/**
 * Unknown runtime adapter implementation (fallback).
 *
 * @module runtime/adapter-unknown
 * @since 3.2.0
 */
import type { RuntimeAdapter } from './types'
/**
 * Create a RuntimeAdapter for unsupported runtimes.
 * All methods throw with descriptive error messages.
 * @internal
 */
export declare function createUnknownAdapter(): RuntimeAdapter
