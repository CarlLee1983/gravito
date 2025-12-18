/**
 * Event system type definitions.
 */

/**
 * Listener interface.
 *
 * All event listeners must implement this interface.
 */
export interface Listener<TEvent extends Event = Event> {
  /**
   * Handle an event.
   * @param event - Event instance
   */
  handle(event: TEvent): Promise<void> | void
}

/**
 * Marker interface for listeners that should be queued.
 *
 * Listeners implementing this interface can be dispatched asynchronously via a queue.
 */
export interface ShouldQueue {
  /**
   * Queue name (optional).
   */
  queue?: string

  /**
   * Connection name (optional).
   */
  connection?: string

  /**
   * Delay before execution (seconds).
   */
  delay?: number
}

/**
 * Marker interface for events that should be broadcast.
 *
 * Events implementing this interface can be automatically broadcast to clients.
 */
export interface ShouldBroadcast {
  /**
   * Define the broadcast channel.
   * @returns Channel name or channel object
   */
  broadcastOn(): string | Channel

  /**
   * Define broadcast payload (optional).
   * If omitted, public event properties will be used.
   * @returns Broadcast payload
   */
  broadcastWith?(): Record<string, unknown>

  /**
   * Define the broadcast event name (optional).
   * If omitted, the event class name will be used.
   * @returns Event name
   */
  broadcastAs?(): string
}

/**
 * Channel interface.
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
 * Base event class.
 *
 * All events should extend this class.
 */
export abstract class Event {
  /**
   * Whether this event should be broadcast.
   */
  shouldBroadcast(): boolean {
    return (
      'broadcastOn' in this &&
      typeof (this as unknown as ShouldBroadcast).broadcastOn === 'function'
    )
  }

  /**
   * Get broadcast channel.
   */
  getBroadcastChannel(): string | Channel | null {
    if (this.shouldBroadcast()) {
      return (this as unknown as ShouldBroadcast).broadcastOn()
    }
    return null
  }

  /**
   * Get broadcast payload.
   */
  getBroadcastData(): Record<string, unknown> {
    if (this.shouldBroadcast()) {
      const broadcast = this as unknown as ShouldBroadcast
      if (broadcast.broadcastWith) {
        return broadcast.broadcastWith()
      }
      // Default to public event properties
      const data: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(this)) {
        if (!key.startsWith('_') && typeof value !== 'function') {
          data[key] = value
        }
      }
      return data
    }
    return {}
  }

  /**
   * Get broadcast event name.
   */
  getBroadcastEventName(): string {
    if (this.shouldBroadcast()) {
      const broadcast = this as unknown as ShouldBroadcast
      if (broadcast.broadcastAs) {
        return broadcast.broadcastAs()
      }
    }
    // Default to class name
    return this.constructor.name
  }
}
