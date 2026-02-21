import type { Context } from 'hono'
import { stream, streamText } from 'hono/streaming'
import type { StreamingApi } from 'hono/utils/stream'

// 重新導出 Hono 內建的 stream 和 streamText
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
export function streamFromGenerator(
  c: Context,
  generator: AsyncGenerator<string | Uint8Array>,
  contentType = 'text/plain; charset=utf-8'
): Response {
  c.header('Content-Type', contentType)

  return stream(c, async (s: StreamingApi) => {
    try {
      for await (const chunk of generator) {
        if (s.aborted) break
        await s.write(chunk)
      }
    } finally {
      await s.close()
    }
  })
}

/**
 * 將 AsyncGenerator 以 NDJSON（換行分隔 JSON）格式輸出。
 *
 * NDJSON 格式：每一行是一個獨立的 JSON 物件，適合 LLM 回應、大型資料集串流。
 * Content-Type 自動設為 application/x-ndjson。
 *
 * @param c - Hono Context
 * @param generator - AsyncGenerator，每次 yield 的值會被序列化為 JSON 行
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { streamJSONLines } from '@gravito/photon/middleware/streaming'
 *
 * const app = new Photon()
 *
 * app.get('/stream-data', (c) => {
 *   async function* generateItems() {
 *     yield { id: 1, message: 'First item' }
 *     yield { id: 2, message: 'Second item' }
 *     yield { id: 3, message: 'Third item' }
 *   }
 *   return streamJSONLines(c, generateItems())
 * })
 * ```
 */
export function streamJSONLines<T>(c: Context, generator: AsyncGenerator<T>): Response {
  // 使用 stream() 而非 streamText()，以避免 streamText 強制設置 text/plain Content-Type
  c.header('Content-Type', 'application/x-ndjson')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Transfer-Encoding', 'chunked')

  return stream(c, async (s: StreamingApi) => {
    try {
      for await (const item of generator) {
        if (s.aborted) break
        await s.writeln(JSON.stringify(item))
      }
    } finally {
      await s.close()
    }
  })
}
