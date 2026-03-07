/**
 * @fileoverview Photon - Gravito 原生 HTTP 引擎
 *
 * 使用 Bun 原生 HTTP Adapter，提供高效能、型別安全的路由系統。
 * 完全基於 @gravito/core 的 BunNativeAdapter，無 Hono 依賴。
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
 * 包裝 BunNativeAdapter，提供便利的 API
 *
 * @public
 */
export class Photon {
  private adapter = new BunNativeAdapter()

  get(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('get', path, ...handlers)
  }

  post(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('post', path, ...handlers)
  }

  put(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('put', path, ...handlers)
  }

  delete(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('delete', path, ...handlers)
  }

  patch(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('patch', path, ...handlers)
  }

  head(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('head', path, ...handlers)
  }

  options(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
    this.adapter.route('options', path, ...handlers)
  }

  use(path: string, ...middleware: GravitoMiddleware[]): void {
    this.adapter.use(path, ...middleware)
  }

  useGlobal(...middleware: GravitoMiddleware[]): void {
    this.adapter.useGlobal(...middleware)
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): void {
    this.adapter.useScoped(scope, path, ...middleware)
  }

  mount(path: string, app: Photon | any): void {
    const subAdapter = app instanceof Photon ? app.adapter : app
    this.adapter.mount(path, subAdapter)
  }

  onError(handler: GravitoErrorHandler): void {
    this.adapter.onError(handler)
  }

  onNotFound(handler: GravitoNotFoundHandler): void {
    this.adapter.onNotFound(handler)
  }

  async fetch(request: Request, server?: any): Promise<Response> {
    return this.adapter.fetch(request, server)
  }

  get websocket() {
    return this.adapter.websocket
  }

  get native(): BunNativeAdapter {
    return this.adapter
  }
}
