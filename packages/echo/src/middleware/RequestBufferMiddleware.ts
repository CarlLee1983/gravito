/**
 * Request Buffer Middleware
 *
 * 在驗證前緩存原始 Request Body，防止框架自動解析 JSON 導致簽章驗證失敗。
 * 這個中介軟體會在請求處理鏈的早期階段攔截並緩存原始內容。
 *
 * @module @gravito/echo/middleware
 * @since v1.1
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { BufferedRequest, RequestBufferConfig } from '../types'

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<RequestBufferConfig> = {
  enabled: true,
  maxBodySize: 10 * 1024 * 1024, // 10MB
  skipContentTypes: ['multipart/form-data', 'application/octet-stream'],
}

/**
 * Request Buffer 中介軟體類別
 *
 * 提供原始 Body 緩存功能，確保簽章驗證使用正確的未解析內容。
 *
 * @example
 * ```typescript
 * const middleware = new RequestBufferMiddleware({
 *   maxBodySize: 5 * 1024 * 1024, // 5MB
 * })
 *
 * core.adapter.use('*', middleware.handler())
 * ```
 */
export class RequestBufferMiddleware {
  private config: Required<RequestBufferConfig>

  constructor(config: RequestBufferConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 建立中介軟體處理函式
   *
   * @returns 中介軟體處理函式
   */
  handler() {
    return async (c: GravitoContext, next: GravitoNext) => {
      if (!this.config.enabled) {
        return await next()
      }

      const contentType = c.req.header('content-type') ?? ''

      // 跳過排除的 content type
      if (this.config.skipContentTypes.some((type) => contentType.includes(type))) {
        return await next()
      }

      // 讀取原始 body
      const rawBody = await this.readRawBody(c)

      // 檢查大小限制
      const bodySize =
        typeof rawBody === 'string' ? Buffer.byteLength(rawBody, 'utf-8') : rawBody.length

      if (bodySize > this.config.maxBodySize) {
        return c.json({ error: 'Request body too large' }, 413)
      }

      // 儲存緩存的請求到 context
      const buffered: BufferedRequest = {
        rawBody,
        headers: c.req.header(),
        bufferedAt: new Date(),
      }

      c.set('bufferedRequest', buffered)

      return await next()
    }
  }

  /**
   * 從請求中讀取原始 body
   *
   * @param c - Gravito Context
   * @returns 原始 body（string 或 Buffer）
   */
  private async readRawBody(c: GravitoContext): Promise<string | Buffer> {
    // 檢查是否已被框架緩存
    const existing = c.get('bufferedRequest') as BufferedRequest | undefined
    if (existing) {
      return existing.rawBody
    }

    // 從請求流中讀取
    const body = await c.req.text()
    return body
  }
}

/**
 * 便捷工廠函式，用於建立 Request Buffer 中介軟體
 *
 * @param config - 中介軟體配置
 * @returns 中介軟體處理函式
 *
 * @example
 * ```typescript
 * core.adapter.use('*', createRequestBufferMiddleware({
 *   maxBodySize: 5 * 1024 * 1024
 * }))
 * ```
 */
export function createRequestBufferMiddleware(config?: RequestBufferConfig) {
  return new RequestBufferMiddleware(config).handler()
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Buffered request for signature verification */
    bufferedRequest?: BufferedRequest
  }
}
