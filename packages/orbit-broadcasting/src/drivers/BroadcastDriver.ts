/**
 * Broadcast driver interface.
 *
 * All broadcast drivers must implement this interface.
 */
export interface BroadcastDriver {
  /**
   * Broadcast an event to a channel.
   *
   * @param channel - Channel object (name and type)
   * @param event - Event name
   * @param data - Event payload
   */
  broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void>

  /**
   * Authorize channel access (for private/presence channels).
   *
   * @param channel - Channel name
   * @param socketId - Socket ID
   * @param userId - User ID (optional)
   * @returns Authorization payload
   */
  authorizeChannel?(
    channel: string,
    socketId: string,
    userId?: string | number
  ): Promise<{ auth: string; channel_data?: string }>
}
