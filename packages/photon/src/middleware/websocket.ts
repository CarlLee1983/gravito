/**
 * @fileoverview WebSocket 中間件 for Photon
 *
 * 提供 Type-Safe 的 WebSocket handler 工廠，基於 Hono 的 WebSocket helper。
 * 支援泛型 <TIn, TOut> 以確保訊息格式的類型安全。
 *
 * @module @gravito/photon/middleware/websocket
 * @since 1.0.0
 */

import type { WSEvents } from 'hono/ws'
import { defineWebSocketHelper, WSContext } from 'hono/ws'

// Re-export Hono 的 WebSocket 相關類型與函式
export { WSContext, defineWebSocketHelper }
export type { WSEvents, WSMessageReceive, WSReadyState } from 'hono/ws'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 型別安全的 WebSocket 訊息處理函式
 *
 * @template TIn  接收訊息的型別
 * @template TOut 發送訊息的型別
 */
export interface TypedWSHandler<TIn = unknown, TOut = unknown> {
  /**
   * 連線建立時的回調
   */
  onOpen?: (ws: TypedWSContext<TOut>) => void | Promise<void>

  /**
   * 接收訊息時的回調（自動解析 JSON 或回傳原始字串）
   */
  onMessage?: (data: TIn, ws: TypedWSContext<TOut>) => void | Promise<void>

  /**
   * 連線關閉時的回調
   */
  onClose?: (code: number, reason: string, ws: TypedWSContext<TOut>) => void | Promise<void>

  /**
   * 發生錯誤時的回調
   */
  onError?: (event: Event, ws: TypedWSContext<TOut>) => void | Promise<void>
}

/**
 * 型別安全的 WebSocket Context
 *
 * 封裝 Hono 的 WSContext，提供型別化的 send 方法
 */
export interface TypedWSContext<TOut = unknown> {
  /**
   * 發送訊息（自動 JSON 序列化非字串類型）
   */
  send(data: TOut): void

  /**
   * 關閉連線
   */
  close(code?: number, reason?: string): void

  /**
   * WebSocket 連線狀態 (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)
   */
  readyState: 0 | 1 | 2 | 3

  /**
   * 連線 URL
   */
  url: URL | null

  /**
   * 底層的 WSContext
   */
  raw: WSContext
}

export interface WSHandlerConfig {
  /**
   * 訊息解析模式
   * - 'json': 嘗試 JSON 解析，失敗時回傳原始字串
   * - 'text': 永遠回傳字串
   * - 'raw': 回傳原始 MessageEvent
   * @default 'json'
   */
  parseMode?: 'json' | 'text' | 'raw'

  /**
   * JSON 解析失敗時的處理方式
   * - 'fallback': 回傳原始字串（預設）
   * - 'throw': 拋出錯誤
   * @default 'fallback'
   */
  parseErrorBehavior?: 'fallback' | 'throw'
}

// ─────────────────────────────────────────────────────────────────────────────
// defineWSHandler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 建立型別安全的 WebSocket handler 工廠
 *
 * @template TIn  接收訊息的型別（預設 unknown）
 * @template TOut 發送訊息的型別（預設 unknown）
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { upgradeWebSocket } from '@gravito/photon/bun'
 * import { defineWSHandler } from '@gravito/photon/middleware/websocket'
 *
 * interface ChatMessage { text: string; user: string }
 * interface ServerMessage { event: string; payload: unknown }
 *
 * const app = new Photon()
 *
 * // 型別安全的 WebSocket handler
 * app.get('/ws/chat', upgradeWebSocket(
 *   defineWSHandler<ChatMessage, ServerMessage>({
 *     onOpen(ws) {
 *       ws.send({ event: 'connected', payload: { status: 'ok' } })
 *     },
 *     onMessage(msg, ws) {
 *       // msg 已自動解析為 ChatMessage
 *       console.log(`${msg.user}: ${msg.text}`)
 *       ws.send({ event: 'echo', payload: msg })
 *     },
 *     onClose(code, reason, ws) {
 *       console.log(`Closed: ${code} ${reason}`)
 *     },
 *   })
 * ))
 * ```
 */
export function defineWSHandler<TIn = unknown, TOut = unknown>(
  handler: TypedWSHandler<TIn, TOut>,
  config: WSHandlerConfig = {}
): (c: unknown) => WSEvents {
  const { parseMode = 'json', parseErrorBehavior = 'fallback' } = config

  return () => {
    const wsEvents: WSEvents = {
      onOpen(_event, rawWs) {
        if (!handler.onOpen) return

        const typedWs = createTypedWSContext<TOut>(rawWs)
        void handler.onOpen(typedWs)
      },

      onMessage(event, rawWs) {
        if (!handler.onMessage) return

        const typedWs = createTypedWSContext<TOut>(rawWs)
        const rawData = event.data

        let parsedData: TIn

        if (parseMode === 'raw') {
          parsedData = rawData as TIn
        } else if (parseMode === 'text') {
          parsedData = (typeof rawData === 'string' ? rawData : String(rawData)) as TIn
        } else {
          // parseMode === 'json'
          if (typeof rawData === 'string') {
            try {
              parsedData = JSON.parse(rawData) as TIn
            } catch {
              if (parseErrorBehavior === 'throw') {
                throw new Error(`WebSocket JSON parse error: ${rawData}`)
              }
              parsedData = rawData as unknown as TIn
            }
          } else {
            parsedData = rawData as unknown as TIn
          }
        }

        void handler.onMessage(parsedData, typedWs)
      },

      onClose(event, rawWs) {
        if (!handler.onClose) return

        const typedWs = createTypedWSContext<TOut>(rawWs)
        void handler.onClose(event.code ?? 1000, event.reason ?? '', typedWs)
      },

      onError(event, rawWs) {
        if (!handler.onError) return

        const typedWs = createTypedWSContext<TOut>(rawWs)
        void handler.onError(event, typedWs)
      },
    }

    return wsEvents
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 建立型別化的 WSContext 包裝器
 */
function createTypedWSContext<TOut>(rawWs: WSContext): TypedWSContext<TOut> {
  return {
    send(data: TOut): void {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data)
      rawWs.send(serialized)
    },

    close(code?: number, reason?: string): void {
      rawWs.close(code, reason)
    },

    get readyState() {
      return rawWs.readyState
    },

    get url() {
      return rawWs.url
    },

    get raw() {
      return rawWs
    },
  }
}
