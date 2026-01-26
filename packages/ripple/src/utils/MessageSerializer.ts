import type { ServerMessage } from '../types'

/**
 * Utility class for serializing server-to-client messages.
 *
 * Provides performance optimizations like pre-serialized common messages
 * and a per-broadcast cache to reduce JSON.stringify overhead during
 * multi-channel broadcasting.
 */
export class MessageSerializer {
  /** Pre-serialized pong message for heartbeat responses */
  private static readonly PONG_MESSAGE = JSON.stringify({ type: 'pong' })

  /** Cached serialized string for the current broadcast operation */
  private broadcastCache: string | null = null

  /**
   * Get the pre-serialized pong message.
   *
   * @returns Serialized {"type":"pong"} string
   */
  getPongMessage(): string {
    return MessageSerializer.PONG_MESSAGE
  }

  /**
   * Serialize a server message to a JSON string.
   *
   * @param message - The server message object to serialize
   * @returns Serialized JSON string
   */
  serialize(message: ServerMessage): string {
    return JSON.stringify(message)
  }

  /**
   * Serialize a message for broadcasting, with internal caching.
   *
   * If a broadcast cache already exists, it is returned immediately.
   * Otherwise, the message is serialized and stored in the cache.
   *
   * @param message - The server message to serialize and cache
   * @returns Serialized JSON string
   */
  serializeForBroadcast(message: ServerMessage): string {
    if (!this.broadcastCache) {
      this.broadcastCache = JSON.stringify(message)
    }
    return this.broadcastCache
  }

  /**
   * Clear the current broadcast cache.
   *
   * Should be called after a broadcast operation is complete to prepare
   * for the next broadcast.
   */
  clearBroadcastCache(): void {
    this.broadcastCache = null
  }
}
