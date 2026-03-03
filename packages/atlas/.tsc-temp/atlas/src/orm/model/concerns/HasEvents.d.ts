import type { Model } from '../Model'
import type { ModelObserver } from '../types'
/**
 * HasEvents Concern
 * @description Provides event system functionality including model lifecycle events and observer registration.
 */
export declare class HasEvents {
  /**
   * Register a model observer to listen for lifecycle events.
   *
   * @template T - The model type
   * @param observer - An object containing lifecycle event handlers
   *
   * @example
   * ```typescript
   * User.observe({
   *   creating: (user) => { user.api_token = Str.random() }
   * })
   * ```
   */
  static observe<T extends Model>(observer: Partial<ModelObserver<T>>): void
  /**
   * Fire a static event that doesn't require a model instance.
   *
   * @param event - The name of the event to fire
   * @internal
   */
  static fire(event: string): Promise<void>
  /**
   * Emit a lifecycle event to instance hooks and registered observers.
   *
   * @param event - The event name
   * @internal
   */
  protected emit(event: string): Promise<void>
}
