import { RippleError, RippleErrorCodes } from '../errors/RippleError'
import type { RippleContext, RippleInterceptor } from '../types'

/**
 * Manages the execution of message interceptors in an onion model.
 *
 * @since 4.0.0
 */
export class InterceptorManager {
  private interceptors: RippleInterceptor[]

  constructor(interceptors: RippleInterceptor[] = []) {
    this.interceptors = interceptors
  }

  /**
   * Execute the interceptor pipeline for a given context.
   *
   * @param ctx - The ripple message context
   * @param finalHandler - The final handler to run after all interceptors
   */
  async execute(ctx: RippleContext, finalHandler: () => Promise<void> | void): Promise<void> {
    if (this.interceptors.length === 0) {
      await finalHandler()
      return
    }

    let index = -1

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new RippleError(RippleErrorCodes.MIDDLEWARE_ERROR, 'next() called multiple times')
      }
      index = i

      const interceptor = i === this.interceptors.length ? null : this.interceptors[i]

      if (!interceptor) {
        await finalHandler()
        return
      }

      await interceptor(ctx, () => dispatch(i + 1))
    }

    return dispatch(0)
  }

  /**
   * Add a new interceptor to the end of the pipeline.
   */
  use(interceptor: RippleInterceptor): void {
    this.interceptors.push(interceptor)
  }
}
