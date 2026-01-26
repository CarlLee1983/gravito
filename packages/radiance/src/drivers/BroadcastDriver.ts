/**
 * Interface defining the contract for all broadcast drivers.
 *
 * Implementations of this interface serve as adapters for specific real-time
 * messaging services (e.g., Pusher, Ably, Redis).
 */
export interface BroadcastDriver {
  /**
   * Broadcast an event to a specific channel.
   *
   * @param channel - The target channel metadata (name and type).
   * @param event - The name of the event being broadcast.
   * @param data - The payload data associated with the event.
   * @throws {Error} If the underlying provider fails to accept the message.
   *
   * @example
   * ```typescript
   * await driver.broadcast(
   *   { name: 'orders', type: 'public' },
   *   'OrderCreated',
   *   { id: 1 }
   * );
   * ```
   */
  broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void>

  /**
   * Authorize a client to access a restricted channel.
   *
   * Used for private and presence channels to generate the necessary
   * authentication signature required by the client SDK.
   *
   * @param channel - The name of the channel to authorize.
   * @param socketId - The unique socket ID provided by the client.
   * @param userId - The identifier of the user (optional).
   * @returns A promise resolving to the auth payload expected by the client.
   *
   * @example
   * ```typescript
   * const auth = await driver.authorizeChannel('private-user.1', 'socket-123', 'user-1');
   * // Returns { auth: "key:signature" }
   * ```
   */
  authorizeChannel?(
    channel: string,
    socketId: string,
    userId?: string | number
  ): Promise<{ auth: string; channel_data?: string }>
}
