/**
 * @fileoverview @gravito/ripple-client - Frontend WebSocket client
 *
 * Connect to @gravito/ripple WebSocket server from any JavaScript environment.
 *
 * @example
 * ```typescript
 * import { createRippleClient } from '@gravito/ripple-client'
 *
 * const client = createRippleClient({
 *   host: 'ws://localhost:3000/ws',
 *   authEndpoint: '/broadcasting/auth',
 * })
 *
 * await client.connect()
 *
 * // Subscribe to public channel
 * client.channel('news')
 *   .listen('ArticlePublished', (data) => {
 *     console.log('New article:', data)
 *   })
 *
 * // Subscribe to private channel
 * client.private('orders.123')
 *   .listen('OrderShipped', (data) => {
 *     console.log('Order shipped:', data)
 *   })
 *
 * // Join presence channel
 * client.join('chat.lobby')
 *   .here((users) => console.log('Online:', users))
 *   .joining((user) => console.log('Joined:', user))
 *   .leaving((user) => console.log('Left:', user))
 * ```
 *
 * @module @gravito/ripple-client
 */

// Channels
export { Channel, PresenceChannel, PrivateChannel } from './Channel'
// Core
export { type ConnectionState, createRippleClient, RippleClient } from './RippleClient'

// Types
export type {
  ClientMessage,
  EventCallback,
  PresenceCallbacks,
  PresenceUser,
  RippleClientConfig,
  ServerMessage,
} from './types'
