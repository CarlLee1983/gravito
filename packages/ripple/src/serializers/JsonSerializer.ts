import type { ClientMessage, ServerMessage } from '../types'
import type { ISerializer } from './ISerializer'

/**
 * Default JSON serializer implementation.
 *
 * Handles standard JSON serialization with optimizations for broadcasting.
 */
export class JsonSerializer implements ISerializer {
  readonly contentType = 'json'

  /** Pre-serialized pong message */
  private static readonly PONG_MESSAGE = JSON.stringify({ type: 'pong' })

  /** Cached serialized string for the current broadcast operation */
  private broadcastCache: string | null = null

  serialize(message: ServerMessage): string {
    return JSON.stringify(message)
  }

  deserialize(data: string | Buffer | ArrayBuffer): ClientMessage {
    let str: string
    if (typeof data === 'string') {
      str = data
    } else if (Buffer.isBuffer(data)) {
      str = data.toString()
    } else {
      str = new TextDecoder().decode(data)
    }
    return JSON.parse(str)
  }

  serializeForBroadcast(message: ServerMessage): string {
    if (!this.broadcastCache) {
      this.broadcastCache = JSON.stringify(message)
    }
    return this.broadcastCache
  }

  clearBroadcastCache(): void {
    this.broadcastCache = null
  }

  getPongMessage(): string {
    return JsonSerializer.PONG_MESSAGE
  }
}
