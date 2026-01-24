import type { ServerMessage } from '../types'

export class MessageSerializer {
  private static readonly PONG_MESSAGE = JSON.stringify({ type: 'pong' })

  private broadcastCache: string | null = null

  getPongMessage(): string {
    return MessageSerializer.PONG_MESSAGE
  }

  serialize(message: ServerMessage): string {
    return JSON.stringify(message)
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
}
