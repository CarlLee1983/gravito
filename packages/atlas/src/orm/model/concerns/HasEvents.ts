/**
 * HasEvents Concern
 *
 * Provides event system functionality including:
 * - Model lifecycle events
 * - Observer registration
 */

export class HasEvents {
  /**
   * Register an observer
   *
   * @param observer - Observer object
   */
  static observe(observer: any): void {
    const modelCtor = this as any
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
    const modelCtor = this.constructor as any
    const observers = modelCtor.observers || []

    for (const observer of observers) {
      if (typeof observer[event] === 'function') {
        await observer[event](this)
      }
    }
  }

  /**
   * Fire a static event (e.g., retrieved)
   *
   * @param event - Event name
   */
  static async fire(event: string): Promise<void> {
    const observers = (this as any).observers || []

    for (const observer of observers) {
      if (typeof observer[event] === 'function') {
        await observer[event]()
      }
    }
  }
}
