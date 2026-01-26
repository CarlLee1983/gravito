/**
 * Base channel interface representing a broadcast destination.
 *
 * Channels segregate broadcast traffic. Different channel types imply different
 * access control rules and behaviors.
 */
export interface Channel {
  /**
   * The unique identifier for the channel.
   *
   * @remarks
   * For private/presence channels, this typically includes a prefix like 'private-' or 'presence-'.
   */
  name: string

  /**
   * The security level and behavior type of the channel.
   */
  type: 'public' | 'private' | 'presence'
}

/**
 * A public channel open to any subscriber.
 *
 * Public channels require no authorization. Any client can subscribe and listen
 * to events broadcast on these channels.
 *
 * @example
 * ```typescript
 * const channel = new PublicChannel('orders');
 * ```
 */
export class PublicChannel implements Channel {
  type = 'public' as const

  /**
   * Creates a new PublicChannel instance.
   *
   * @param name - The name of the channel (without prefixes).
   */
  constructor(public name: string) {}
}

/**
 * A private channel requiring authorization.
 *
 * Private channels are secured and require the client to provide an authentication
 * signature (usually via an auth endpoint) before subscription is allowed.
 * Suitable for sensitive user data.
 *
 * @example
 * ```typescript
 * const channel = new PrivateChannel('user.123');
 * // Driver may prefix this as 'private-user.123'
 * ```
 */
export class PrivateChannel implements Channel {
  type = 'private' as const

  /**
   * Creates a new PrivateChannel instance.
   *
   * @param name - The name of the channel.
   */
  constructor(public name: string) {}
}

/**
 * A presence channel that tracks online users.
 *
 * Presence channels extend private channels by adding the ability to know *who*
 * is subscribed. They are commonly used for chat rooms, "user is typing" indicators,
 * and online user lists.
 *
 * @example
 * ```typescript
 * const channel = new PresenceChannel('chat.room.1');
 * // Driver may prefix this as 'presence-chat.room.1'
 * ```
 */
export class PresenceChannel implements Channel {
  type = 'presence' as const

  /**
   * Creates a new PresenceChannel instance.
   *
   * @param name - The name of the channel.
   */
  constructor(public name: string) {}
}
