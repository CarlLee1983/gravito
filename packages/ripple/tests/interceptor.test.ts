import { describe, expect, it, mock } from 'bun:test'
import { InterceptorManager } from '../src/middleware/InterceptorManager'
import type { RippleContext } from '../src/types'

describe('InterceptorManager', () => {
  it('should execute interceptors in order (Onion Model)', async () => {
    const manager = new InterceptorManager()
    const order: string[] = []

    manager.use(async (ctx, next) => {
      order.push('in-1')
      await next()
      order.push('out-1')
    })

    manager.use(async (ctx, next) => {
      order.push('in-2')
      await next()
      order.push('out-2')
    })

    const ctx: RippleContext = {
      ws: {} as any,
      message: { type: 'ping' } as any,
      direction: 'incoming',
    }

    const handler = mock(() => {
      order.push('handler')
    })

    await manager.execute(ctx, handler)

    expect(order).toEqual(['in-1', 'in-2', 'handler', 'out-2', 'out-1'])
    expect(handler).toHaveBeenCalled()
  })

  it('should allow short-circuiting', async () => {
    const manager = new InterceptorManager()
    const order: string[] = []

    manager.use(async (ctx, next) => {
      order.push('in-1')
      // Don't call next()
    })

    manager.use(async (ctx, next) => {
      order.push('in-2')
      await next()
    })

    const handler = mock(() => {})
    const ctx: RippleContext = {
      ws: {} as any,
      message: { type: 'ping' } as any,
      direction: 'incoming',
    }

    await manager.execute(ctx, handler)

    expect(order).toEqual(['in-1'])
    expect(handler).not.toHaveBeenCalled()
  })

  it('should throw if next() is called multiple times', async () => {
    const manager = new InterceptorManager()

    manager.use(async (ctx, next) => {
      await next()
      await next()
    })

    const ctx = { direction: 'incoming' } as any
    await expect(manager.execute(ctx, () => {})).rejects.toThrow('next() called multiple times')
  })
})
