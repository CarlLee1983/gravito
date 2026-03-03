import type { GravitoHandler } from '../http/types'
import type { PlanetCore } from '../PlanetCore'
import type { ControllerClass } from '../Router'
export declare class ControllerDispatcher {
  private core
  private controllers
  constructor(core: PlanetCore)
  /**
   * Resolve Controller Instance and Method
   */
  resolve(CtrlClass: ControllerClass, methodName: string): GravitoHandler
}
