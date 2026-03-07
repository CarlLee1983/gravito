/**
 * WebSocket Middleware for Photon.
 *
 * Provides native WebSocket support for Photon applications, leveraging
 * Bun's high-performance WebSocket implementation with Hono-compatible API.
 *
 * @module @gravito/photon/middleware/websocket
 * @since 2.0.0
 */

import type { WSEvents } from 'hono/ws'
import { defineWebSocketHelper, WSContext } from 'hono/ws'

// Re-export native WebSocket implementation (zero Hono type dependency for handler logic)
export {
  defineWSHandler,
  type NativeWSCloseEvent,
  type NativeWSContext,
  type NativeWSEvents,
  type NativeWSMessageEvent,
  type TypedWSContext,
  type TypedWSHandler,
  type WSHandlerConfig,
} from './websocket-native'

// Import for adapter function
import { defineWSHandler } from './websocket-native'

// Backward compatibility: re-export Hono's types and helper
export { WSContext, defineWebSocketHelper }
export type { WSEvents, WSMessageReceive, WSReadyState } from 'hono/ws'

// ─────────────────────────────────────────────────────────────────────────────
// Hono Adapter - Convert Hono WSContext to NativeWSContext
// ─────────────────────────────────────────────────────────────────────────────

import type { NativeWSContext } from './websocket-native'

/**
 * Adapt Hono's WSContext to our generic NativeWSContext interface
 * for use with defineWSHandler
 *
 * @internal
 */
export function adaptHonoWSContext(honoWs: WSContext): NativeWSContext {
  return {
    send(data: string): void {
      honoWs.send(data)
    },

    close(code?: number, reason?: string): void {
      honoWs.close(code, reason)
    },

    get readyState() {
      return honoWs.readyState
    },

    get url() {
      return honoWs.url
    },
  }
}

/**
 * Adapt Hono's message event to NativeWSMessageEvent
 *
 * @internal
 */
export function adaptHonoMessageEvent(honoEvent: any): {
  data: string | ArrayBuffer | Uint8Array
  lastMessageInBatch?: boolean
} {
  return {
    data: honoEvent.data,
  }
}

/**
 * Wrap defineWSHandler to work with Hono's WSEvents
 *
 * Provides backward compatibility by adapting our native handler
 * to Hono's WSContext and WSEvents types.
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
 * app.get('/ws/chat', upgradeWebSocket(
 *   defineWSHandler<ChatMessage, ServerMessage>({
 *     onOpen(ws) {
 *       ws.send({ event: 'connected', payload: { status: 'ok' } })
 *     },
 *     onMessage(msg, ws) {
 *       console.log(`${msg.user}: ${msg.text}`)
 *       ws.send({ event: 'echo', payload: msg })
 *     },
 *     onClose(code, reason, ws) {
 *       console.log(`Closed: ${code} ${reason}`)
 *     },
 *   })
 * ))
 * ```
 *
 * @param handler - WebSocket handler definition
 * @param config - Handler configuration
 * @returns Hono WSEvents handler
 * @public
 */
export function defineHonoWSHandler<TIn = unknown, TOut = unknown>(
  handler: Parameters<typeof defineWSHandler<TIn, TOut>>[0],
  config?: Parameters<typeof defineWSHandler<TIn, TOut>>[1]
): (c: unknown) => WSEvents {
  const nativeHandlerFactory = defineWSHandler(handler, config)

  return (c: unknown) => {
    const nativeEvents = nativeHandlerFactory(c)

    // Adapt native events to Hono's WSEvents
    const honoEvents: WSEvents = {
      onOpen(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        return nativeEvents.onOpen?.(event, nativeWs)
      },

      onMessage(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        const nativeEvent = adaptHonoMessageEvent(event)
        return nativeEvents.onMessage?.(nativeEvent, nativeWs)
      },

      onClose(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        const nativeEvent = { code: event.code, reason: event.reason }
        return nativeEvents.onClose?.(nativeEvent, nativeWs)
      },

      onError(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        return nativeEvents.onError?.(event, nativeWs)
      },
    }

    return honoEvents
  }
}
