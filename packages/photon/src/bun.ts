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
 * Bun adapter for Photon.
 *
 * Provides Bun-specific bindings and optimizations for running Photon
 * on the Bun runtime (e.g., `serveStatic`).
 *
 * @public
 */
export * from 'hono/bun'
