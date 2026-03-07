/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
 * RPC Client for Photon.
 *
 * A type-safe client for consuming Photon APIs, used primarily by
 * `@gravito/beam` for seamless backend-to-frontend communication.
 *
 * @public
 */
export * from 'hono/client'
