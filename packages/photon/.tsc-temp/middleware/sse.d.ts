/**
 * @fileoverview SSE (Server-Sent Events) 中間件 for Photon
 *
 * 提供 Server-Sent Events 的類型安全封裝，基於 Hono 的 streamSSE 輔助函式。
 * 自動設定正確的 SSE headers（Cache-Control、Connection、Content-Type）。
 *
 * @module @gravito/photon/middleware/sse
 * @since 1.0.0
 */
import type { Context } from '@gravito/photon'
import type { SSEMessage } from 'hono/streaming'
import { SSEStreamingApi, streamSSE } from 'hono/streaming'
export { SSEStreamingApi, streamSSE }
export type { SSEMessage }
export interface SSEEvent<TData = string> {
  /**
   * 事件名稱（可選）
   * @example 'message', 'update', 'error'
   */
  event?: string
  /**
   * 事件資料
   */
  data: TData
  /**
   * 事件唯一 ID（可選，用於斷線重連）
   */
  id?: string
  /**
   * 重試間隔（毫秒，可選）
   */
  retry?: number
}
export interface SSEConfig {
  /**
   * 自定義 headers（會合併到標準 SSE headers 中）
   */
  headers?: Record<string, string>
  /**
   * 錯誤處理回調
   */
  onError?: (error: Error) => void
  /**
   * 是否跳過初始 keep-alive ping（預設 false）
   */
  skipInitialPing?: boolean
}
/**
 * SSE 回調函式類型
 */
export type SSEHandler<TData = string> = (
  stream: SSEStreamingApi,
  send: (event: SSEEvent<TData>) => Promise<void>
) => Promise<void>
/**
 * 建立 SSE 回應的輔助函式
 *
 * 自動設定必要的 SSE headers，並提供類型安全的事件發送介面。
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { createSSEResponse } from '@gravito/photon/middleware/sse'
 *
 * const app = new Photon()
 *
 * // 基本用法
 * app.get('/events', (c) => {
 *   return createSSEResponse(c, async (stream, send) => {
 *     for (let i = 0; i < 5; i++) {
 *       await send({ event: 'update', data: `Event ${i}` })
 *       await stream.sleep(1000)
 *     }
 *   })
 * })
 *
 * // 型別安全的結構化資料
 * interface Update { count: number; status: string }
 *
 * app.get('/typed-events', (c) => {
 *   return createSSEResponse<Update>(c, async (stream, send) => {
 *     await send({ event: 'update', data: { count: 1, status: 'ok' } })
 *   })
 * })
 * ```
 */
export declare function createSSEResponse<TData = string>(
  c: Context,
  handler: SSEHandler<TData>,
  config?: SSEConfig
): Response
