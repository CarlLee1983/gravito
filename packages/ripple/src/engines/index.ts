/**
 * @fileoverview Ripple WebSocket Engine exports
 *
 * Provides runtime-agnostic WebSocket engine implementations for Ripple.
 *
 * @module @gravito/ripple/engines
 * @since 5.0.0
 */

export type { BunEngineConfig } from './BunEngine'
export { BunEngine, BunRippleSocket } from './BunEngine'
export type { EngineFactory, IRippleEngine, RippleSocket } from './IRippleEngine'

// Multi-runtime engines (v5.0 - planned)
// TODO: Enable when uWebSockets.js and ws dependencies are properly configured
// export type { UWebSocketsEngineConfig } from './UWebSocketsEngine'
// export { UWebSocketsEngine, UWebSocketsRippleSocket } from './UWebSocketsEngine'
// export type { WsEngineConfig } from './WsEngine'
// export { WsEngine, WsRippleSocket } from './WsEngine'
