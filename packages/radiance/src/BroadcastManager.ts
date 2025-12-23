import type { PlanetCore } from 'gravito-core'
import type { BroadcastDriver } from './drivers/BroadcastDriver'

/**
 * Channel authorization callback.
 */
export type ChannelAuthorizationCallback = (
  channel: string,
  socketId: string,
  userId?: string | number
) => Promise<boolean>

/**
 * Broadcast manager.
 *
 * Responsible for managing the broadcast driver and handling broadcast requests.
 */
export class BroadcastManager {
  private driver: BroadcastDriver | null = null
  private authCallback?: ChannelAuthorizationCallback

  constructor(private core: PlanetCore) {}

  /**
   * Set the broadcast driver.
   *
   * @param driver - The broadcast driver to use.
   */
  setDriver(driver: BroadcastDriver): void {
    this.driver = driver
  }

  /**
   * Set the channel authorization callback.
   *
   * @param callback - The callback function for channel authorization.
   */
  setAuthCallback(callback: ChannelAuthorizationCallback): void {
    this.authCallback = callback
  }

  /**
   * Broadcast an event.
   *
   * @param _event - Event instance (unused in current implementation, but kept for signature compatibility).
   * @param channel - Channel object containing name and type.
   * @param data - Event payload.
   * @param eventName - Event name.
   * @returns A promise that resolves when the event is broadcast.
   */
  async broadcast(
    _event: unknown,
    channel: { name: string; type: string },
    data: Record<string, unknown>,
    eventName: string
  ): Promise<void> {
    if (!this.driver) {
      this.core.logger.warn('[BroadcastManager] No broadcast driver set, skipping broadcast')
      return
    }

    try {
      await this.driver.broadcast(channel, eventName, data)
    } catch (error) {
      this.core.logger.error(`[BroadcastManager] Failed to broadcast event ${eventName}:`, error)
      throw error
    }
  }

  /**
   * Authorize channel access.
   *
   * @param channel - Channel name.
   * @param socketId - Socket ID.
   * @param userId - User ID (optional).
   * @returns A promise resolving to the authorization payload or null if unauthorized.
   */
  async authorizeChannel(
    channel: string,
    socketId: string,
    userId?: string | number
  ): Promise<{ auth: string; channel_data?: string } | null> {
    // Check authorization callback first.
    if (this.authCallback) {
      const authorized = await this.authCallback(channel, socketId, userId)
      if (!authorized) {
        return null
      }
    }

    // If the driver supports authorization, use it.
    if (this.driver?.authorizeChannel) {
      return await this.driver.authorizeChannel(channel, socketId, userId)
    }

    // Default deny for private/presence channels.
    if (channel.startsWith('private-') || channel.startsWith('presence-')) {
      return null
    }

    // Public channels do not require authorization.
    return { auth: '' }
  }
}
