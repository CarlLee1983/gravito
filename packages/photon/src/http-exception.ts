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
 * HTTP Exceptions for Photon.
 *
 * Standardized HTTP error classes (HTTPException) for handling
 * error responses in a consistent way across the Gravito ecosystem.
 *
 * @public
 */
export * from 'hono/http-exception'
