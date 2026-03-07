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
 * RegExp Router for Photon.
 *
 * A router implementation using regular expressions for pattern matching.
 * Used internally by Photon for complex route patterns.
 *
 * @public
 */
export * from 'hono/router/reg-exp-router'
