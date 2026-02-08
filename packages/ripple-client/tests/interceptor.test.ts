/**
 * @file Client-side Interceptor Tests
 *
 * Tests the v4.0 interceptor functionality for @gravito/ripple-client
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { InterceptorManager, type RippleContext } from '../src/InterceptorManager'

describe('Client InterceptorManager', () => {
  let manager: InterceptorManager

  beforeEach(() => {
    manager = new InterceptorManager()
  })

  it('should execute interceptors in onion order', async () => {
    const order: string[] = []

    manager.use(async (_ctx, next) => {
      order.push('1-before')
      await next()
      order.push('1-after')
    })

    manager.use(async (_ctx, next) => {
      order.push('2-before')
      await next()
      order.push('2-after')
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    const finalHandler = mock(() => {
      order.push('handler')
    })

    await manager.execute(ctx, finalHandler)

    expect(order).toEqual(['1-before', '2-before', 'handler', '2-after', '1-after'])
    expect(finalHandler).toHaveBeenCalledTimes(1)
  })

  it('should allow short-circuiting by not calling next()', async () => {
    const order: string[] = []

    manager.use(async (_ctx, _next) => {
      order.push('interceptor-1')
      // Don't call next() - short circuit
    })

    manager.use(async (_ctx, next) => {
      order.push('interceptor-2')
      await next()
    })

    const finalHandler = mock(() => {
      order.push('handler')
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await manager.execute(ctx, finalHandler)

    expect(order).toEqual(['interceptor-1'])
    expect(finalHandler).not.toHaveBeenCalled()
  })

  it('should throw error if next() is called multiple times', async () => {
    manager.use(async (_ctx, next) => {
      await next()
      await next() // Second call should throw
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await expect(manager.execute(ctx, () => {})).rejects.toThrow('next() called multiple times')
  })

  it('should propagate errors from interceptors', async () => {
    manager.use(async (_ctx, _next) => {
      throw new Error('Interceptor error')
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await expect(manager.execute(ctx, () => {})).rejects.toThrow('Interceptor error')
  })

  it('should allow context modification', async () => {
    manager.use(async (ctx, next) => {
      // Modify message in interceptor
      ;(ctx.message as any).modified = true
      await next()
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    const finalHandler = mock(() => {
      expect((ctx.message as any).modified).toBe(true)
    })

    await manager.execute(ctx, finalHandler)
    expect(finalHandler).toHaveBeenCalled()
  })

  it('should handle async interceptors correctly', async () => {
    const delays: number[] = []

    manager.use(async (_ctx, next) => {
      const start = Date.now()
      await next()
      delays.push(Date.now() - start)
    })

    manager.use(async (_ctx, next) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      await next()
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await manager.execute(ctx, () => {})

    expect(delays[0]).toBeGreaterThanOrEqual(10)
  })

  it('should support multiple interceptors with different directions', async () => {
    const logs: string[] = []

    manager.use(async (ctx, next) => {
      if (ctx.direction === 'incoming') {
        logs.push('incoming-interceptor')
      }
      await next()
    })

    manager.use(async (ctx, next) => {
      if (ctx.direction === 'outgoing') {
        logs.push('outgoing-interceptor')
      }
      await next()
    })

    // Test incoming
    const incomingCtx: RippleContext = {
      message: { type: 'event', event: 'test', data: {} } as any,
      direction: 'incoming',
    }

    await manager.execute(incomingCtx, () => {})
    expect(logs).toContain('incoming-interceptor')

    // Test outgoing
    logs.length = 0
    const outgoingCtx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await manager.execute(outgoingCtx, () => {})
    expect(logs).toContain('outgoing-interceptor')
    expect(logs).not.toContain('incoming-interceptor')
  })

  it('should handle empty interceptor list', async () => {
    const emptyManager = new InterceptorManager([])

    const handler = mock(() => {})
    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await emptyManager.execute(ctx, handler)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should maintain context between interceptors', async () => {
    let contextRef: RippleContext | null = null

    manager.use(async (ctx, next) => {
      contextRef = ctx
      await next()
    })

    manager.use(async (ctx, next) => {
      expect(ctx).toBe(contextRef) // Same reference
      await next()
    })

    const ctx: RippleContext = {
      message: { type: 'subscribe', channel: 'test' },
      direction: 'outgoing',
    }

    await manager.execute(ctx, () => {})
  })
})
