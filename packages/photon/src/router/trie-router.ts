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
 * Trie Router for Photon.
 *
 * A high-performance router implementation using a Radix Tree (Trie).
 * This is the default and fastest router for Photon.
 *
 * @public
 */
export * from 'hono/router/trie-router'
