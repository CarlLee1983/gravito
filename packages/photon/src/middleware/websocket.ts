/**
 * @fileoverview WebSocket Middleware for Photon
 *
 * Provides type-safe WebSocket handler factory using native Web Streams API.
 * Works with any runtime (Bun, Node.js, browsers) without Hono dependency.
 *
 * @module @gravito/photon/middleware/websocket
 * @since 2.0.0
 */

// Re-export native WebSocket implementation
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
