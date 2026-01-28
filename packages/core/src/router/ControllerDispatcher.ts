import type { GravitoHandler } from '../http/types'
import type { PlanetCore } from '../PlanetCore'
import type { ControllerClass } from '../Router'

export class ControllerDispatcher {
  // Singleton cache for controllers
  private controllers = new Map<ControllerClass, unknown>()

  constructor(private core: PlanetCore) {}

  /**
   * Resolve Controller Instance and Method
   */
  resolve(CtrlClass: ControllerClass, methodName: string): GravitoHandler {
    let instance = this.controllers.get(CtrlClass)
    if (!instance) {
      instance = new CtrlClass(this.core)
      this.controllers.set(CtrlClass, instance)
    }

    const handler = (instance as Record<string, unknown>)[methodName]
    if (typeof handler !== 'function') {
      throw new Error(`Method '${methodName}' not found in controller '${CtrlClass.name}'`)
    }

    // The handler in the controller should match GravitoHandler signature (ctx) => Response
    // If it expects (ctx, next), it's middleware.
    // Usually controllers are final endpoints.
    return handler.bind(instance) as GravitoHandler
  }
}
