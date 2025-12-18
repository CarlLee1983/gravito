import { Event } from './Event'
import type { Listener, ShouldQueue } from './Listener'
import type { PlanetCore } from './PlanetCore'

/**
 * Listener registration metadata.
 */
interface ListenerRegistration<TEvent extends Event = Event> {
  listener: Listener<TEvent> | (new () => Listener<TEvent>)
  queue?: string
  connection?: string
  delay?: number
}

/**
 * Event manager.
 *
 * Provides type-safe event dispatching and listener registration.
 * Supports both synchronous listeners and asynchronous (queued) listeners.
 *
 * @example
 * ```typescript
 * class UserRegistered extends Event {
 *   constructor(public user: User) {
 *     super()
 *   }
 * }
 *
 * class SendWelcomeEmail implements Listener<UserRegistered> {
 *   async handle(event: UserRegistered): Promise<void> {
 *     // send welcome email
 *   }
 * }
 *
 * // Register listener
 * core.events.listen(UserRegistered, SendWelcomeEmail)
 *
 * // Dispatch event
 * await core.events.dispatch(new UserRegistered(user))
 * ```
 */
export class EventManager {
  /**
   * Listener registry.
   * Key: event class or event name
   * Value: listener registrations
   */
  private listeners = new Map<string | (new () => Event), ListenerRegistration[]>()

  /**
   * Broadcast manager (optional, injected by `orbit-broadcasting`).
   */
  private broadcastManager:
    | {
        broadcast(
          event: Event,
          channel: string | { name: string; type: string },
          data: Record<string, unknown>,
          eventName: string
        ): Promise<void>
      }
    | undefined

  /**
   * Queue manager (optional, injected by `orbit-queue`).
   */
  private queueManager:
    | {
        push(job: unknown, queue?: string, connection?: string, delay?: number): Promise<void>
      }
    | undefined

  constructor(private core: PlanetCore) {}

  /**
   * Register the broadcast manager (called by `orbit-broadcasting`).
   */
  setBroadcastManager(manager: EventManager['broadcastManager']): void {
    this.broadcastManager = manager
  }

  /**
   * Register the queue manager (called by `orbit-queue`).
   */
  setQueueManager(manager: EventManager['queueManager']): void {
    this.queueManager = manager
  }

  /**
   * Register an event listener.
   *
   * @param event - Event class or event name
   * @param listener - Listener instance or listener class
   * @param options - Optional queue options
   *
   * @example
   * ```typescript
   * // Synchronous listener
   * core.events.listen(UserRegistered, SendWelcomeEmail)
   *
   * // Queued listener (async)
   * core.events.listen(UserRegistered, SendWelcomeEmail, {
   *   queue: 'emails',
   *   delay: 60
   * })
   * ```
   */
  listen<TEvent extends Event>(
    event: string | (new (...args: unknown[]) => TEvent),
    listener: Listener<TEvent> | (new () => Listener<TEvent>),
    options?: {
      queue?: string
      connection?: string
      delay?: number
    }
  ): void {
    const eventKey = typeof event === 'string' ? event : event
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, [])
    }

    const registration: ListenerRegistration<TEvent> = {
      listener,
      ...options,
    }

    this.listeners.get(eventKey)!.push(registration)
  }

  /**
   * Remove an event listener.
   *
   * @param event - Event class or event name
   * @param listener - Listener to remove
   */
  unlisten<TEvent extends Event>(
    event: string | (new (...args: unknown[]) => TEvent),
    listener: Listener<TEvent> | (new () => Listener<TEvent>)
  ): void {
    const eventKey = typeof event === 'string' ? event : event
    const registrations = this.listeners.get(eventKey)
    if (!registrations) return

    const filtered = registrations.filter((reg) => reg.listener !== listener)
    if (filtered.length === 0) {
      this.listeners.delete(eventKey)
    } else {
      this.listeners.set(eventKey, filtered)
    }
  }

  /**
   * Dispatch an event.
   *
   * Runs all registered listeners. If a listener implements `ShouldQueue` or
   * has queue options, the listener will be pushed to the queue for async execution.
   *
   * @param event - Event instance
   *
   * @example
   * ```typescript
   * await core.events.dispatch(new UserRegistered(user))
   * ```
   */
  async dispatch<TEvent extends Event>(event: TEvent): Promise<void> {
    const eventKey = event.constructor as new () => Event
    const eventName = event.constructor.name

    // Trigger hooks (backward compatible)
    await this.core.hooks.doAction(`event:${eventName}`, event)
    await this.core.hooks.doAction('event:dispatched', { event, eventName })

    // Broadcast
    if (event instanceof Event && event.shouldBroadcast() && this.broadcastManager) {
      const channel = event.getBroadcastChannel()
      if (channel) {
        const channelName = typeof channel === 'string' ? channel : channel.name
        const channelType = typeof channel === 'string' ? 'public' : channel.type
        const data = event.getBroadcastData()
        const broadcastEventName = event.getBroadcastEventName()

        await this.broadcastManager
          .broadcast(event, { name: channelName, type: channelType }, data, broadcastEventName)
          .catch((error) => {
            this.core.logger.error(`[EventManager] Failed to broadcast event ${eventName}:`, error)
          })
      }
    }

    // Collect listeners (check class key first, then string name)
    const registrations = this.listeners.get(eventKey) || []
    const stringRegistrations = this.listeners.get(eventName) || []
    const allRegistrations = [...registrations, ...stringRegistrations]

    // Execute listeners
    for (const registration of allRegistrations) {
      try {
        // Resolve listener instance
        let listenerInstance: Listener<TEvent>
        if (typeof registration.listener === 'function') {
          // Class: instantiate
          listenerInstance = new registration.listener() as Listener<TEvent>
        } else {
          // Instance: use directly
          listenerInstance = registration.listener as Listener<TEvent>
        }

        // Determine whether it should be queued
        const shouldQueue =
          'queue' in listenerInstance ||
          registration.queue !== undefined ||
          registration.connection !== undefined ||
          registration.delay !== undefined

        if (shouldQueue && this.queueManager) {
          // Push to queue
          const queue = (listenerInstance as unknown as ShouldQueue).queue || registration.queue
          const connection =
            (listenerInstance as unknown as ShouldQueue).connection || registration.connection
          const delay = (listenerInstance as unknown as ShouldQueue).delay || registration.delay

          // Create a queue job wrapper
          const queueJob = {
            type: 'event-listener',
            event: eventName,
            listener: listenerInstance.constructor.name,
            eventData: this.serializeEvent(event),
            handle: async () => {
              await listenerInstance.handle(event)
            },
          }

          await this.queueManager.push(queueJob, queue, connection, delay)
        } else {
          // Run synchronously
          await listenerInstance.handle(event)
        }
      } catch (error) {
        this.core.logger.error(`[EventManager] Error in listener for event ${eventName}:`, error)
        // Continue with other listeners
      }
    }
  }

  /**
   * Serialize an event (for queueing).
   */
  private serializeEvent(event: Event): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(event)) {
      if (!key.startsWith('_') && typeof value !== 'function') {
        data[key] = value
      }
    }
    return data
  }

  /**
   * Get all registered listeners.
   */
  getListeners(event?: string | (new () => Event)): ListenerRegistration[] {
    if (event) {
      const eventKey = typeof event === 'string' ? event : event
      return this.listeners.get(eventKey) || []
    }
    const all: ListenerRegistration[] = []
    for (const registrations of this.listeners.values()) {
      all.push(...registrations)
    }
    return all
  }

  /**
   * Clear all listeners.
   */
  clear(): void {
    this.listeners.clear()
  }
}
