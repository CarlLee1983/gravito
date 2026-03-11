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
 * @gravito/photon - Vercel Edge Functions 適配器
 *
 * 提供 Photon 應用程式在 Vercel Edge Runtime 上的執行支援。
 * 兼容 Vercel Edge Functions 和 Vercel Serverless Functions。
 *
 * @example 用法
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { handle } from '@gravito/photon/adapter/vercel'
 *
 * const app = new Photon()
 * app.get('/api/hello', (c) => c.json({ message: 'Hello from Vercel Edge!' }))
 *
 * export default handle(app)
 * ```
 *
 * @packageDocumentation
 */

// Vercel Edge Functions adapter
export { getConnInfo, handle } from 'hono/vercel'
