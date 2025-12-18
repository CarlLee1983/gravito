/**
 * Base channel interface.
 */
export interface Channel {
  /**
   * Channel name.
   */
  name: string

  /**
   * Channel type.
   */
  type: 'public' | 'private' | 'presence'
}

/**
 * Public channel.
 */
export class PublicChannel implements Channel {
  type = 'public' as const

  constructor(public name: string) {}
}

/**
 * Private channel.
 */
export class PrivateChannel implements Channel {
  type = 'private' as const

  constructor(public name: string) {}
}

/**
 * Presence channel (can track online users).
 */
export class PresenceChannel implements Channel {
  type = 'presence' as const

  constructor(public name: string) {}
}
