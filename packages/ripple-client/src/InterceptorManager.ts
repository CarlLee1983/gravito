import type { ClientMessage, ServerMessage } from './types'

export interface RippleContext {
  message: ClientMessage | ServerMessage
  direction: 'incoming' | 'outgoing'
  channel?: string
  event?: string
}

export type RippleInterceptor = (
  ctx: RippleContext,
  next: () => Promise<void>
) => Promise<void> | void

export class InterceptorManager {
  private interceptors: RippleInterceptor[] = []

  constructor(interceptors: RippleInterceptor[] = []) {
    this.interceptors = interceptors
  }

  async execute(ctx: RippleContext, finalHandler: () => Promise<void> | void): Promise<void> {
    if (this.interceptors.length === 0) {
      await finalHandler()
      return
    }

    let index = -1
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error('next() called multiple times')
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

  use(interceptor: RippleInterceptor): void {
    this.interceptors.push(interceptor)
  }
}
