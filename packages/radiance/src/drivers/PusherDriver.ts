import type { BroadcastDriver } from './BroadcastDriver'

/**
 * Configuration for the Pusher broadcast driver.
 */
export interface PusherDriverConfig {
  /**
   * The application ID provided by Pusher.
   */
  appId: string

  /**
   * The public application key.
   */
  key: string

  /**
   * The secret key for signing requests.
   */
  secret: string

  /**
   * The Pusher cluster to connect to (e.g., 'mt1', 'eu').
   * @defaultValue 'mt1'
   */
  cluster?: string

  /**
   * Whether to force TLS (HTTPS) for API requests.
   * @defaultValue true
   */
  useTLS?: boolean
}

/**
 * Pusher broadcast driver implementation.
 *
 * Interacts with the Pusher HTTP API to trigger events on channels.
 * It handles request signing, authentication generation for private channels,
 * and HTTP communication using the native Fetch API.
 *
 * @remarks
 * This driver avoids heavy dependencies by implementing the necessary crypto
 * signatures (HMAC-SHA256 and MD5) using standard Web Crypto or Bun APIs.
 *
 * @example
 * ```typescript
 * const driver = new PusherDriver({
 *   appId: '123456',
 *   key: 'my-app-key',
 *   secret: 'my-app-secret',
 *   cluster: 'us2'
 * });
 * ```
 */
export class PusherDriver implements BroadcastDriver {
  private baseUrl: string

  /**
   * Creates a new PusherDriver instance.
   *
   * @param config - The Pusher connection configuration.
   */
  constructor(private config: PusherDriverConfig) {
    const cluster = this.config.cluster || 'mt1'
    this.baseUrl = `https://api-${cluster}.pusher.com`
  }

  /**
   * Broadcast an event to a channel via the Pusher API.
   *
   * @param channel - The target channel metadata.
   * @param event - The name of the event.
   * @param data - The event payload.
   * @throws {Error} If the Pusher API returns a non-200 response.
   *
   * @example
   * ```typescript
   * await driver.broadcast({ name: 'news', type: 'public' }, 'BreakingNews', { title: 'Hello' });
   * ```
   */
  async broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const path = `/apps/${this.config.appId}/events`
    const body = {
      name: event,
      channel: channel.name,
      data: JSON.stringify(data),
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const queryString = new URLSearchParams({
      auth_key: this.config.key,
      auth_timestamp: timestamp.toString(),
      auth_version: '1.0',
      body_md5: this.md5(JSON.stringify(body)),
    })

    const authString = `POST\n${path}\n${queryString.toString()}`
    const authSignature = await this.hmacSHA256(authString, this.config.secret)

    queryString.append('auth_signature', authSignature)

    const response = await fetch(`${this.baseUrl}${path}?${queryString.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to broadcast via Pusher: ${error}`)
    }
  }

  /**
   * Generate an authorization signature for private or presence channels.
   *
   * @param channel - The name of the channel.
   * @param socketId - The client's socket ID.
   * @param userId - The user ID (required for presence channels).
   * @returns The auth object expected by Pusher client libraries.
   *
   * @example
   * ```typescript
   * const auth = await driver.authorizeChannel('private-user.1', '123.456');
   * ```
   */
  async authorizeChannel(
    channel: string,
    socketId: string,
    userId?: string | number
  ): Promise<{ auth: string; channel_data?: string }> {
    const stringToSign = `${socketId}:${channel}`
    const signature = await this.hmacSHA256(stringToSign, this.config.secret)

    if (channel.startsWith('presence-')) {
      const channelData = JSON.stringify({
        user_id: userId?.toString(),
        user_info: {},
      })
      return {
        auth: `${this.config.key}:${signature}`,
        channel_data: channelData,
      }
    }

    return {
      auth: `${this.config.key}:${signature}`,
    }
  }

  private async hmacSHA256(message: string, secret: string): Promise<string> {
    // Uses the Web Crypto API.
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(message)

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    const hashArray = Array.from(new Uint8Array(signature))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  private md5(str: string): string {
    const hasher = new Bun.CryptoHasher('md5')
    hasher.update(str)
    return hasher.digest('hex')
  }
}
