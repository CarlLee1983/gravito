import type { BroadcastDriver } from './BroadcastDriver'

/**
 * Ably driver configuration.
 */
export interface AblyDriverConfig {
  apiKey: string
}

/**
 * Ably driver.
 *
 * Broadcasts through the Ably service.
 */
export class AblyDriver implements BroadcastDriver {
  private baseUrl = 'https://rest.ably.io'

  constructor(private config: AblyDriverConfig) {}

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

  async authorizeChannel(
    channel: string,
    socketId: string,
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
