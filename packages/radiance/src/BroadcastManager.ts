import type { PlanetCore } from '@gravito/core'
import type { BroadcastDriver } from './drivers/BroadcastDriver'

/**
 * Channel authorization callback.
 *
 * Used to verify if a user has permission to join a specific broadcast channel.
 *
 * @param channel - The name of the channel to authorize
 * @param socketId - The unique identifier for the client connection
 * @param userId - The identifier of the user requesting access
 * @returns True if the user is authorized to join the channel
 */
export type ChannelAuthorizationCallback = (
  channel: string,
  socketId: string,
  userId?: string | number
) => Promise<boolean>

/**
 * Central manager for real-time event broadcasting.
 *
 * Orchestrates the delivery of events to various broadcast drivers and handles
 * channel authorization logic. It acts as a bridge between Gravito's event system
 * and external real-time services.
 *
 * @example
 * ```typescript
 * const manager = new BroadcastManager(core);
 * manager.setDriver(new PusherDriver(config));
 * await manager.broadcast(null, { name: 'orders', type: 'public' }, { id: 1 }, 'OrderCreated');
 * ```
 */
export class BroadcastManager {
  private driver: BroadcastDriver | null = null
  private authCallback?: ChannelAuthorizationCallback
  private throwOnError = true

  constructor(private core: PlanetCore) {}

  /**
   * Configure error handling behavior for broadcast operations.
   *
   * Determines whether failures in the underlying broadcast driver should
   * propagate as exceptions or be silently logged.
   *
   * @param throwOnError - Enable or disable exception propagation on failure
   *
   * @example
   * ```typescript
   * manager.setThrowOnError(false); // Log errors instead of throwing
   * ```
   */
  setThrowOnError(throwOnError: boolean): void {
    this.throwOnError = throwOnError
  }

  /**
   * Assign the active broadcast delivery driver.
   *
   * Sets the driver responsible for the actual transmission of event data
   * to the real-time service (e.g., Pusher, Ably, Redis).
   *
   * @param driver - The broadcast driver implementation to use
   *
   * @example
   * ```typescript
   * manager.setDriver(new RedisDriver(config));
   * ```
   */
  setDriver(driver: BroadcastDriver): void {
    this.driver = driver
  }

  /**
   * Register a custom authorization logic for private channels.
   *
   * Provides a hook to implement business-specific permission checks
   * before allowing a client to subscribe to restricted channels.
   *
   * @param callback - The authorization logic implementation
   *
   * @example
   * ```typescript
   * manager.setAuthCallback(async (channel, socketId, userId) => {
   *   return userId === 'admin';
   * });
   * ```
   */
  setAuthCallback(callback: ChannelAuthorizationCallback): void {
    this.authCallback = callback
  }

  /**
   * Transmit an event payload to a specific channel.
   *
   * Forwards the event data to the configured driver. If no driver is set,
   * the broadcast is skipped with a warning.
   *
   * @param _event - The original event instance (reserved for future use)
   * @param channel - Target channel metadata including name and visibility type
   * @param data - The serializable payload to be transmitted
   * @param eventName - The name of the event as it will appear on the client
   * @throws {Error} If the driver fails and throwOnError is enabled
   *
   * @example
   * ```typescript
   * await manager.broadcast(
   *   null,
   *   { name: 'private-user.1', type: 'private' },
   *   { message: 'Hello' },
   *   'UserMessage'
   * );
   * ```
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
      if (this.throwOnError) {
        throw error
      }
    }
  }

  /**
   * Validate client access to a specific channel.
   *
   * Executes the registered authorization callback and, if available,
   * delegates to the driver's native authorization mechanism.
   *
   * @param channel - The name of the channel to authorize
   * @param socketId - The unique identifier for the client connection
   * @param userId - The identifier of the user requesting access
   * @returns The authorization payload or null if access is denied
   *
   * @example
   * ```typescript
   * const auth = await manager.authorizeChannel('private-user.1', '123.456', 'user_1');
   * ```
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
