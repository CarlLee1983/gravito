import type { BroadcastDriver } from './BroadcastDriver'

/**
 * Configuration options for the Ably broadcast driver.
 */
export interface AblyDriverConfig {
  /**
   * The Ably API key.
   *
   * Format: "appId.keyId:secret"
   */
  apiKey: string
}

/**
 * Ably broadcast driver implementation.
 *
 * Uses the Ably REST API to publish messages to channels.
 * Suitable for high-reliability global messaging without managing infrastructure.
 *
 * @remarks
 * This driver uses standard HTTP fetch for publishing and does not require the full Ably SDK.
 * Presence authorization is implemented using a basic compatible format.
 *
 * @example
 * ```typescript
 * const driver = new AblyDriver({
 *   apiKey: 'APP_ID.KEY_ID:SECRET'
 * });
 * ```
 */
export class AblyDriver implements BroadcastDriver {
  private baseUrl = 'https://rest.ably.io'

  /**
   * Creates a new AblyDriver instance.
   *
   * @param config - The Ably connection configuration.
   */
  constructor(private config: AblyDriverConfig) {}

  /**
   * Broadcast an event to an Ably channel.
   *
   * @param channel - The target channel metadata.
   * @param event - The name of the event.
   * @param data - The event payload.
   * @throws {Error} If the Ably API request fails.
   *
   * @example
   * ```typescript
   * await driver.broadcast({ name: 'orders', type: 'public' }, 'OrderCreated', { id: 123 });
   * ```
   */
  async broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const path = `/channels/${channel.name}/messages`
    const auth = btoa(this.config.apiKey)

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: event,
        data,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to broadcast via Ably: ${error}`)
    }
  }

  /**
   * Authorize a client for a private or presence channel.
   *
   * @param channel - The channel name.
   * @param _socketId - The socket ID (unused by Ably REST auth in this simple mode).
   * @param userId - The user ID (used for presence).
   * @returns The authorization object.
   *
   * @example
   * ```typescript
   * const auth = await driver.authorizeChannel('presence-chat', 'socket-1', 'user-1');
   * ```
   */
  async authorizeChannel(
    channel: string,
    _socketId: string,
    userId?: string | number
  ): Promise<{ auth: string; channel_data?: string }> {
    // Ably uses a different authorization mechanism.
    // This is only a basic implementation.
    return {
      auth: this.config.apiKey,
      ...(channel.startsWith('presence-') && userId
        ? {
            channel_data: JSON.stringify({
              clientId: userId.toString(),
            }),
          }
        : {}),
    }
  }
}
