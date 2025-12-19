import { Event } from './Event'
import type { Listener } from './Listener'
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
export declare class EventManager {
  private core
  /**
   * Listener registry.
   * Key: event class or event name
   * Value: listener registrations
   */
  private listeners
  /**
   * Broadcast manager (optional, injected by `orbit-broadcasting`).
   */
  private broadcastManager
  /**
   * Queue manager (optional, injected by `orbit-queue`).
   */
  private queueManager
  constructor(core: PlanetCore)
  /**
   * Register the broadcast manager (called by `orbit-broadcasting`).
   */
  setBroadcastManager(manager: EventManager['broadcastManager']): void
  /**
   * Register the queue manager (called by `orbit-queue`).
   */
  setQueueManager(manager: EventManager['queueManager']): void
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
  ): void
  /**
   * Remove an event listener.
   *
   * @param event - Event class or event name
   * @param listener - Listener to remove
   */
  unlisten<TEvent extends Event>(
    event: string | (new (...args: unknown[]) => TEvent),
    listener: Listener<TEvent> | (new () => Listener<TEvent>)
  ): void
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
  dispatch<TEvent extends Event>(event: TEvent): Promise<void>
  /**
   * Serialize an event (for queueing).
   */
  private serializeEvent
  /**
   * Get all registered listeners.
   */
  getListeners(event?: string | (new () => Event)): ListenerRegistration[]
  /**
   * Clear all listeners.
   */
  clear(): void
}
//# sourceMappingURL=EventManager.d.ts.map
