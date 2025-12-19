import type { MiddlewareHandler } from 'hono'
import type { PlanetCore } from '../../PlanetCore'
export declare class ThrottleRequests {
  private core
  constructor(core: PlanetCore)
  /**
   * Create the middleware
   * @param maxAttempts - Max requests allowed
   * @param decaySeconds - Time window in seconds
   */
  handle(maxAttempts?: number, decaySeconds?: number): MiddlewareHandler
}
//# sourceMappingURL=ThrottleRequests.d.ts.map
