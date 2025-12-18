import type { BroadcastDriver } from './BroadcastDriver'

/**
 * WebSocket connection interface.
 */
export interface WebSocketConnection {
  send(data: string): void
  close(): void
  readyState: number
}

/**
 * WebSocket driver configuration.
 */
export interface WebSocketDriverConfig {
  /**
   * Get all active connections.
   */
  getConnections(): WebSocketConnection[]

  /**
   * Filter connections by channel (optional).
   */
  filterConnectionsByChannel?(channel: string): WebSocketConnection[]
}

/**
 * WebSocket driver.
 *
 * Broadcasts via WebSocket.
 * Suitable for single-node deployments or when direct WebSocket connections are required.
 */
export class WebSocketDriver implements BroadcastDriver {
  constructor(private config: WebSocketDriverConfig) {}

  async broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const message = JSON.stringify({
      channel: channel.name,
      event,
      data,
    })

    let connections = this.config.getConnections()

    // If channel filtering is supported, use it.
    if (this.config.filterConnectionsByChannel) {
      connections = this.config.filterConnectionsByChannel(channel.name)
    }

    // Send to all connections.
    for (const connection of connections) {
      if (connection.readyState === 1) {
        // WebSocket.OPEN
        try {
          connection.send(message)
        } catch (error) {
          // Ignore failed sends.
          console.error('Failed to send WebSocket message:', error)
        }
      }
    }
  }
}
