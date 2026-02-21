/**
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
