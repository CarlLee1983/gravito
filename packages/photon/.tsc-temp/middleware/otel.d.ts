/**
 * @fileoverview OpenTelemetry 整合中間件
 *
 * 提供可選的 OpenTelemetry 追蹤整合。
 * 當 @opentelemetry/api 未安裝時，自動降級為 no-op 模式。
 *
 * @module @gravito/photon/middleware/otel
 * @since 1.0.0
 */
import type { Context, MiddlewareHandler } from '@gravito/photon'
export interface OtelMiddlewareConfig {
  /**
   * 服務名稱（用於 span 的 service.name 屬性）
   * @default 'photon'
   */
  serviceName?: string
  /**
   * 服務版本
   * @default '1.0.0'
   */
  serviceVersion?: string
  /**
   * 排除追蹤的路徑列表（支援前綴比對）
   * @example ['/health', '/metrics']
   * @default []
   */
  excludePaths?: string[]
  /**
   * 自定義 span 名稱生成器
   * @default (c) => `${c.req.method} ${c.req.routePath || c.req.path}`
   */
  spanNameResolver?: (c: Context) => string
  /**
   * 是否在 response header 中傳播 trace id
   * @default true
   */
  propagateTraceId?: boolean
  /**
   * 傳播 trace id 的 header 名稱
   * @default 'X-Trace-Id'
   */
  traceIdHeader?: string
}
/**
 * 建立 OpenTelemetry 追蹤中間件
 *
 * 當 @opentelemetry/api 未安裝時，自動降級為 no-op 模式，不影響應用運行。
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { otelMiddleware } from '@gravito/photon/middleware/otel'
 *
 * const app = new Photon()
 *
 * // 基本使用
 * app.use('*', otelMiddleware())
 *
 * // 自定義配置
 * app.use('*', otelMiddleware({
 *   serviceName: 'my-api',
 *   excludePaths: ['/health', '/metrics'],
 *   propagateTraceId: true,
 * }))
 * ```
 */
export declare function otelMiddleware(config?: OtelMiddlewareConfig): MiddlewareHandler
