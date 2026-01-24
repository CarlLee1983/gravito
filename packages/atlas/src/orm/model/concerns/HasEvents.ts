import type { Model } from '../Model'
import type { ModelObserver } from '../types'

/**
 * HasEvents Concern
 * @description Provides event system functionality including model lifecycle events and observer registration.
 */
export class HasEvents {
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
  static observe<T extends Model>(observer: Partial<ModelObserver<T>>): void {
    const modelCtor = this as unknown as typeof import('../Model').Model & {
      observers?: Partial<ModelObserver<Model>>[]
    }
    if (!modelCtor.observers) {
      modelCtor.observers = []
    }
    modelCtor.observers.push(observer)
  }

  /**
   * Emit a lifecycle event to all registered observers and instance hooks.
   *
   * @param event - The name of the event to emit (e.g., 'saving', 'created')
   * @internal
   */
  protected async emit(event: string): Promise<void> {
    const modelCtor = this.constructor as unknown as typeof import('../Model').Model & {
      observers?: Partial<ModelObserver<Model>>[]
    }
    const observers = modelCtor.observers || []

    for (const observer of observers) {
      const handler = observer[event as keyof ModelObserver<Model>]
      if (typeof handler === 'function') {
        await handler.call(observer, this as unknown as Model)
      }
    }
  }

  /**
   * Fire a static event that doesn't require a model instance.
   *
   * @param event - The name of the event to fire
   * @internal
   */
  static async fire(event: string): Promise<void> {
    const observers =
      (
        this as unknown as typeof import('../Model').Model & {
          observers?: Partial<ModelObserver<Model>>[]
        }
      ).observers || []

    for (const observer of observers) {
      const handler = observer[event as keyof ModelObserver<Model>]
      if (typeof handler === 'function') {
        await (handler as () => void | Promise<void>).call(observer)
      }
    }
  }
}
