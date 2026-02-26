import type { Context } from 'hono'
import { stream, streamText } from 'hono/streaming'
export { stream, streamText }
/**
 * 將 AsyncGenerator 轉換為 HTTP 串流回應。
 *
 * 適用於 LLM 回應串流、即時資料推送等場景。
 *
 * @param c - Hono Context
 * @param generator - AsyncGenerator，每次 yield 的值會被寫入串流
 * @param contentType - 回應的 Content-Type，預設為 text/plain; charset=utf-8
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { streamFromGenerator } from '@gravito/photon/middleware/streaming'
 *
 * const app = new Photon()
 *
 * app.get('/llm', (c) => {
 *   async function* generate() {
 *     yield 'Hello '
 *     yield 'from '
 *     yield 'LLM!'
 *   }
 *   return streamFromGenerator(c, generate())
 * })
 * ```
 */
export declare function streamFromGenerator(
  c: Context,
  generator: AsyncGenerator<string | Uint8Array>,
  contentType?: string
): Response
/**
 * streamJSONLines 的可選設定參數。
 */
export interface StreamJSONLinesOptions {
  /**
   * 批量模式的批次大小。
   *
   * 當設定大於 1 的值時，會收集多個項目後一次性寫入串流，
   * 可降低 write() 呼叫次數、減少字串拼接開銷，適合高吞吐量場景。
   *
   * 預設為 undefined（逐行模式），保持向後相容。
   */
  batchSize?: number
}
/**
 * 將 AsyncGenerator 以 NDJSON（換行分隔 JSON）格式輸出。
 *
 * NDJSON 格式：每一行是一個獨立的 JSON 物件，適合 LLM 回應、大型資料集串流。
 * Content-Type 自動設為 application/x-ndjson。
 *
 * @param c - Hono Context
 * @param generator - AsyncGenerator，每次 yield 的值會被序列化為 JSON 行
 * @param options - 可選設定，支援 batchSize 批量模式優化
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { streamJSONLines } from '@gravito/photon/middleware/streaming'
 *
 * const app = new Photon()
 *
 * // 逐行模式（預設，向後相容）
 * app.get('/stream-data', (c) => {
 *   async function* generateItems() {
 *     yield { id: 1, message: 'First item' }
 *     yield { id: 2, message: 'Second item' }
 *     yield { id: 3, message: 'Third item' }
 *   }
 *   return streamJSONLines(c, generateItems())
 * })
 *
 * // 批量模式（高吞吐量場景，每 50 個項目批次寫入）
 * app.get('/stream-bulk', (c) => {
 *   async function* generateBulk() {
 *     for (let i = 0; i < 10000; i++) {
 *       yield { id: i, value: Math.random() }
 *     }
 *   }
 *   return streamJSONLines(c, generateBulk(), { batchSize: 50 })
 * })
 * ```
 */
export declare function streamJSONLines<T>(
  c: Context,
  generator: AsyncGenerator<T>,
  options?: StreamJSONLinesOptions
): Response
