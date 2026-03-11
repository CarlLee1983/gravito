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
 * @gravito/photon - Deno Deploy 適配器
 *
 * 提供 Photon 應用程式在 Deno Deploy 和 Deno 執行環境上的執行支援。
 * 基於 Deno 的原生 HTTP 伺服器 API。
 *
 * @example 用法
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.get('/', (c) => c.text('Hello from Deno Deploy!'))
 *
 * Deno.serve(app.fetch)
 * ```
 *
 * @example 靜態資源服務
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { serveStatic } from '@gravito/photon/adapter/deno'
 *
 * const app = new Photon()
 * app.use('/static/*', serveStatic({ root: './public' }))
 * ```
 *
 * @packageDocumentation
 */

// Deno adapter - re-export from hono/deno
export { getConnInfo, serveStatic, toSSG, upgradeWebSocket } from 'hono/deno'
