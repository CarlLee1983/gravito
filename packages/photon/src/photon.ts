/**
 * @fileoverview Photon - Gravito 原生 HTTP 引擎
 *
 * 使用 Bun 原生 HTTP Adapter，提供高效能、型別安全的路由系統。
 * 不依賴 Hono，完全基於 @gravito/core 的 BunNativeAdapter。
 *
 * @module @gravito/photon/photon
 * @public
 */

import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
} from '@gravito/core'
import { BunNativeAdapter } from '@gravito/core'

/**
 * Photon 應用類別 - 高效能 Gravito HTTP 引擎
 *
 * 包裝 BunNativeAdapter，提供便利的 API：
 * - HTTP 方法：get, post, put, delete, patch, head, options
 * - 中間件：use, useGlobal, useScoped
 * - 掛載：mount
 * - 錯誤處理：onError, onNotFound
 * - WebSocket：支援透過 websocket 屬性
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 *
 * app.get('/api/health', (c) => c.json({ status: 'ok' }))
 * app.use(authMiddleware)
 *
 * export default app
 * ```
 *
 * @public
 */
export class Photon {
  private adapter = new BunNativeAdapter()

  // ===== HTTP 便利方法 =====

  /**
   * 註冊 GET 路由
   */
  get(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('GET', path, ...handlers)
  }

  /**
   * 註冊 POST 路由
   */
  post(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('POST', path, ...handlers)
  }

  /**
   * 註冊 PUT 路由
   */
  put(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('PUT', path, ...handlers)
  }

  /**
   * 註冊 DELETE 路由
   */
  delete(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('DELETE', path, ...handlers)
  }

  /**
   * 註冊 PATCH 路由
   */
  patch(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('PATCH', path, ...handlers)
  }

  /**
   * 註冊 HEAD 路由
   */
  head(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('HEAD', path, ...handlers)
  }

  /**
   * 註冊 OPTIONS 路由
   */
  options(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('OPTIONS', path, ...handlers)
  }

  // ===== 中間件 =====

  /**
   * 註冊路徑特定的中間件
   */
  use(path: string, ...middleware: GravitoMiddleware[]): void {
    this.adapter.use(path, ...middleware)
  }

  /**
   * 註冊全局中間件（應用於所有路由）
   */
  useGlobal(...middleware: GravitoMiddleware[]): void {
    this.adapter.useGlobal(...middleware)
  }

  /**
   * 註冊作用域中間件（供 Orbit 使用）
   */
  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): void {
    this.adapter.useScoped(scope, path, ...middleware)
  }

  // ===== 路由掛載 =====

  /**
   * 掛載子應用或適配器
   */
  mount(path: string, app: Photon | any): void {
    const subAdapter = app instanceof Photon ? app.adapter : app
    this.adapter.mount(path, subAdapter)
  }

  // ===== 錯誤處理 =====

  /**
   * 設置全局錯誤處理器
   */
  onError(handler: GravitoErrorHandler): void {
    this.adapter.onError(handler)
  }

  /**
   * 設置 404 處理器
   */
  onNotFound(handler: GravitoNotFoundHandler): void {
    this.adapter.onNotFound(handler)
  }

  // ===== 請求處理 =====

  /**
   * 處理 HTTP 請求
   */
  async fetch(request: Request, server?: any): Promise<Response> {
    return this.adapter.fetch(request, server)
  }

  // ===== WebSocket 支援 =====

  /**
   * 取得 WebSocket 處理器（供 Bun.serve 使用）
   */
  get websocket() {
    return this.adapter.websocket
  }

  // ===== 內部訪問 =====

  /**
   * 取得底層適配器（供進階使用）
   */
  get native(): BunNativeAdapter {
    return this.adapter
  }
}
