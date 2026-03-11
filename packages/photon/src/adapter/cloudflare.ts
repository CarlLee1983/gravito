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
 * @gravito/photon - Cloudflare Workers/Pages 適配器
 *
 * 提供 Photon 應用程式在 Cloudflare Workers 和 Cloudflare Pages Functions 上的執行支援。
 *
 * @example Cloudflare Workers 用法
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { serveStatic, upgradeWebSocket } from '@gravito/photon/adapter/cloudflare'
 *
 * const app = new Photon()
 * app.get('/', (c) => c.text('Hello from Cloudflare Workers!'))
 *
 * export default app
 * ```
 *
 * @example Cloudflare Pages Functions 用法
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { handle } from '@gravito/photon/adapter/cloudflare'
 *
 * const app = new Photon()
 * app.get('/', (c) => c.text('Hello from Cloudflare Pages!'))
 *
 * export const onRequest = handle(app)
 * ```
 *
 * @packageDocumentation
 */

// Cloudflare Pages adapter - provides handle() wrapper
export { handle, handleMiddleware } from 'hono/cloudflare-pages'
// Cloudflare Workers adapter
export { getConnInfo, serveStatic, upgradeWebSocket } from 'hono/cloudflare-workers'
