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

  get(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('get', path, ...handlers)
    return this
  }

  post(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('post', path, ...handlers)
    return this
  }

  put(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('put', path, ...handlers)
    return this
  }

  delete(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('delete', path, ...handlers)
    return this
  }

  patch(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('patch', path, ...handlers)
    return this
  }

  head(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('head', path, ...handlers)
    return this
  }

  options(path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): this {
    this.adapter.route('options', path, ...handlers)
    return this
  }

  use(path: string, ...middleware: GravitoMiddleware[]): this {
    this.adapter.use(path, ...middleware)
    return this
  }

  useGlobal(...middleware: GravitoMiddleware[]): this {
    this.adapter.useGlobal(...middleware)
    return this
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): this {
    this.adapter.useScoped(scope, path, ...middleware)
    return this
  }

  route(basePath: string, app: Photon): this {
    this.mount(basePath, app)
    return this
  }

  mount(path: string, app: Photon | any): this {
    const subAdapter = app instanceof Photon ? app.adapter : app
    this.adapter.mount(path, subAdapter)
    return this
  }

  onError(handler: GravitoErrorHandler): this {
    this.adapter.onError(handler)
    return this
  }

  onNotFound(handler: GravitoNotFoundHandler): this {
    this.adapter.onNotFound(handler)
    return this
  }

  async fetch(request: Request, server?: any): Promise<Response> {
    return this.adapter.fetch(request, server)
  }

  async request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input.startsWith('http')
          ? input
          : `http://localhost${input}`
        : input instanceof URL
          ? input.toString()
          : (input as Request).url
    const request = input instanceof Request ? input : new Request(url, init)
    return this.fetch(request)
  }

  get websocket() {
    return this.adapter.websocket
  }

  get native(): BunNativeAdapter {
    return this.adapter
  }
}

export { PhotonWithGravitoSupport as Photon }
