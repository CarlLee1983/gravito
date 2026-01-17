import type { Model } from '../Model'

/**
 * Trait for managing model events and observers.
 *
 * @public
 * @since 3.0.0
 */
export abstract class HasEvents {
  /**
   * Register a model observer
   */
  static observe(observer: any) {
    if (!Object.hasOwn(this, 'observers')) {
      ;(this as any).observers = []
    }
    ;(this as any).observers.push(observer)
  }

  /**
   * Emit a model event
   */
  protected async emit(this: Model, event: string): Promise<void> {
    const modelCtor = this.constructor as typeof Model

    // 1. Instance method hooks
    const methodName = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`
    if (typeof (this as any)[methodName] === 'function') {
      await (this as any)[methodName]()
    }

    // 2. Observers
    if (modelCtor.observers && modelCtor.observers.length > 0) {
      for (const observer of modelCtor.observers) {
        if (typeof observer[event] === 'function') {
          await observer[event](this)
        }
      }
    }
  }
}
