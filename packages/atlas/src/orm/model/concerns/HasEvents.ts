/**
 * HasEvents Concern
 *
 * Provides event system functionality including:
 * - Model lifecycle events
 * - Observer registration
 */

import type { Model } from '../Model'
import type { ModelObserver } from '../types'

export class HasEvents {
  /**
   * Register an observer
   *
   * @param observer - Observer object
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
   * Emit an event to observers
   *
   * @param event - Event name
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
   * Fire a static event (e.g., retrieved)
   *
   * @param event - Event name
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
