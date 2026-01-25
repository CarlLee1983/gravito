/**
 * @gravito/radiance
 *
 * A lightweight, high-performance broadcasting library for the Gravito framework.
 * It provides a unified API for broadcasting events across different drivers
 * (Pusher, Ably, Redis, WebSocket) with zero runtime overhead for unused drivers.
 *
 * @module
 * @example
 * ```typescript
 * // Quick setup with PlanetCore
 * import { PlanetCore } from '@gravito/core';
 * import { OrbitRadiance } from '@gravito/radiance';
 *
 * const core = await PlanetCore.boot({
 *   orbits: [
 *     OrbitRadiance.configure({
 *       driver: 'redis',
 *       config: { url: 'redis://localhost:6379' }
 *     })
 *   ]
 * });
 * ```
 */

export type { ChannelAuthorizationCallback } from './BroadcastManager'
export { BroadcastManager } from './BroadcastManager'
export type { Channel } from './channels/Channel'
export {
  PresenceChannel,
  PrivateChannel,
  PublicChannel,
} from './channels/Channel'
export type { AblyDriverConfig } from './drivers/AblyDriver'
export { AblyDriver } from './drivers/AblyDriver'
export type { BroadcastDriver } from './drivers/BroadcastDriver'
export type { PusherDriverConfig } from './drivers/PusherDriver'
export { PusherDriver } from './drivers/PusherDriver'
export type { RedisDriverConfig } from './drivers/RedisDriver'
export { RedisDriver } from './drivers/RedisDriver'
export type { WebSocketDriverConfig } from './drivers/WebSocketDriver'
export { WebSocketDriver } from './drivers/WebSocketDriver'
export type { OrbitRadianceOptions } from './OrbitRadiance'
export { OrbitRadiance } from './OrbitRadiance'
