/**
 * @fileoverview Channel classes for @gravito/ripple-client
 * @module @gravito/ripple-client
 */

import type { EventCallback, PresenceCallbacks, PresenceUser } from './types'

/**
 * Base channel class for event subscription
 */
export class Channel {
  protected listeners = new Map<string, Set<EventCallback>>()

  constructor(
    public readonly name: string,
    protected sendMessage: (msg: object) => void
  ) {}

  /**
   * Listen for an event on this channel.
   *
   * @param event - The event name.
   * @param callback - Function to execute when the event is received.
   * @returns The Channel instance for chaining.
   */
  listen<T = unknown>(event: string, callback: EventCallback<T>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as EventCallback)
    return this
  }

  /**
   * Stop listening for an event.
   *
   * @param event - The event name (optional). If omitted, all listeners for all events are removed.
   * @param callback - The specific callback to remove (optional). If omitted, all listeners for the event are removed.
   * @returns The Channel instance for chaining.
   */
  stopListening(event?: string, callback?: EventCallback): this {
    if (!event) {
      this.listeners.clear()
    } else if (!callback) {
      this.listeners.delete(event)
    } else {
      this.listeners.get(event)?.delete(callback)
    }
    return this
  }

  /**
   * Dispatch an event to all listeners.
   *
   * @param event - The event name.
   * @param data - The event data.
   * @internal
   */
  _dispatch(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data)
        } catch (e) {
          console.error('[Ripple] Error in event callback:', e)
        }
      }
    }
  }

  /**
   * Send a client event (whisper) to other subscribers.
   *
   * Whispers are not broadcast back to the sender.
   *
   * @param event - The event name.
   * @param data - The event data.
   * @returns The Channel instance for chaining.
   */
  whisper(event: string, data: unknown): this {
    this.sendMessage({
      type: 'whisper',
      channel: this.name,
      event,
      data,
    })
    return this
  }
}

/**
 * Private channel - requires authentication.
 */
export class PrivateChannel extends Channel {
  /**
   * Create a new PrivateChannel instance.
   *
   * @param name - The base name of the channel.
   * @param sendMessage - Function to send messages to the server.
   */
  constructor(name: string, sendMessage: (msg: object) => void) {
    super(`private-${name}`, sendMessage)
  }
}

/**
 * Presence channel - tracks online users.
 */
export class PresenceChannel extends Channel {
  private members: PresenceUser[] = []
  private presenceCallbacks: PresenceCallbacks = {}

  /**
   * Create a new PresenceChannel instance.
   *
   * @param name - The base name of the channel.
   * @param sendMessage - Function to send messages to the server.
   */
  constructor(name: string, sendMessage: (msg: object) => void) {
    super(`presence-${name}`, sendMessage)
  }

  /**
   * Register a callback for when the initial member list is received.
   *
   * @param callback - Function that receives an array of users.
   * @returns The PresenceChannel instance for chaining.
   */
  here(callback: (users: PresenceUser[]) => void): this {
    this.presenceCallbacks.here = callback
    return this
  }

  /**
   * Register a callback for when a user joins the channel.
   *
   * @param callback - Function that receives the user object.
   * @returns The PresenceChannel instance for chaining.
   */
  joining(callback: (user: PresenceUser) => void): this {
    this.presenceCallbacks.joining = callback
    return this
  }

  /**
   * Register a callback for when a user leaves the channel.
   *
   * @param callback - Function that receives the user object.
   * @returns The PresenceChannel instance for chaining.
   */
  leaving(callback: (user: PresenceUser) => void): this {
    this.presenceCallbacks.leaving = callback
    return this
  }

  /**
   * Get the current list of members in the channel.
   *
   * @returns An array of `PresenceUser` objects.
   */
  getMembers(): PresenceUser[] {
    return [...this.members]
  }

  /**
   * Handle presence events from the server.
   *
   * @param event - The presence event type ('join', 'leave', or 'members').
   * @param data - The event data.
   * @internal
   */
  _handlePresence(event: 'join' | 'leave' | 'members', data: unknown): void {
    switch (event) {
      case 'members':
        this.members = data as PresenceUser[]
        this.presenceCallbacks.here?.(this.members)
        break

      case 'join': {
        const joiningUser = data as PresenceUser
        this.members.push(joiningUser)
        this.presenceCallbacks.joining?.(joiningUser)
        break
      }

      case 'leave': {
        const leavingUser = data as PresenceUser
        this.members = this.members.filter((m) => m.id !== leavingUser.id)
        this.presenceCallbacks.leaving?.(leavingUser)
        break
      }
    }
  }
}
