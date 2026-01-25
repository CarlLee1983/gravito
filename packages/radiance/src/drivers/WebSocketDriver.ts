import type { Logger } from '@gravito/core'
import type { BroadcastDriver } from './BroadcastDriver'

/**
 * Interface representing a WebSocket connection.
 *
 * Abstracts the native WebSocket or similar connection object to allow
 * different underlying implementations (e.g., standard WebSocket, uWebSockets.js).
 */
export interface WebSocketConnection {
  /**
   * Send a message to the client.
   *
   * @param data - The stringified message payload.
   */
  send(data: string): void

  /**
   * Close the connection.
   */
  close(): void

  /**
   * The current state of the connection (1 = OPEN).
   */
  readyState: number
}

/**
 * Configuration for the WebSocket broadcast driver.
 */
export interface WebSocketDriverConfig {
  /**
   * Retrieve all active WebSocket connections.
   *
   * This function is called on every broadcast to get the list of recipients.
   */
  getConnections(): WebSocketConnection[]

  /**
   * Optional strategy to filter connections based on channel subscriptions.
   *
   * @param channel - The name of the channel to filter by.
   */
  filterConnectionsByChannel?(channel: string): WebSocketConnection[]

  /**
   * Logger instance for reporting broadcast failures.
   */
  logger?: Logger
}

/**
 * Native WebSocket broadcast driver.
 *
 * Broadcasts events directly to connected WebSocket clients.
 * Ideal for single-node deployments or simple setups where you want to
 * avoid external dependencies like Pusher or Redis.
 *
 * @remarks
 * This driver iterates over all (or filtered) connections and sends the message.
 * It is not scalable across multiple nodes without an additional sync mechanism (like Redis).
 *
 * @example
 * ```typescript
 * const driver = new WebSocketDriver({
 *   getConnections: () => Array.from(wss.clients),
 *   logger: console
 * });
 * ```
 */
export class WebSocketDriver implements BroadcastDriver {
  /**
   * Creates a new WebSocketDriver instance.
   *
   * @param config - Driver configuration.
   */
  constructor(private config: WebSocketDriverConfig) {}

  /**
   * Broadcast an event to WebSocket clients.
   *
   * @param channel - The target channel metadata.
   * @param event - The name of the event.
   * @param data - The event payload.
   *
   * @example
   * ```typescript
   * await driver.broadcast({ name: 'chat', type: 'public' }, 'NewMessage', { text: 'Hi' });
   * ```
   */
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
          this.config.logger?.warn('WebSocket broadcast failed', {
            channel: channel.name,
            event,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }
  }
}
