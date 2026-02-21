/**
 * 中間件預編譯語義變更回歸測試
 *
 * 驗證 compileMiddlewareChain 的語義正確性
 * 測試 nextCalled 旗標模式下的行為
 */

import { describe, expect, it } from 'bun:test'
import type { GravitoContext, Middleware } from '../src/engine/types'

/**
 * 複製 Gravito.ts 中的 compileMiddlewareChain 函數供測試使用
 */
function compileMiddlewareChain(
  middleware: Middleware[],
  handler: (ctx: GravitoContext) => Promise<Response>
): (ctx: GravitoContext) => Promise<Response> {
  // Fast path: no middleware
  if (middleware.length === 0) {
    return handler
  }

  // Single middleware optimization
  if (middleware.length === 1) {
    const mw = middleware[0]!
    return async (ctx) => {
      let nextCalled = false
      const result = await mw(ctx, async () => {
        nextCalled = true
        return undefined
      })
      if (result instanceof Response) {
        return result
      }
      if (nextCalled) {
        return await handler(ctx)
      }
      return ctx.json({ error: 'Middleware did not call next or return response' }, 500)
    }
  }

  // Multiple middleware: compile right-to-left into a chain
  let compiled = handler

  for (let i = middleware.length - 1; i >= 0; i--) {
    const mw = middleware[i]!
    const nextHandler = compiled
    compiled = async (ctx) => {
      let nextCalled = false
      const result = await mw(ctx, async () => {
        nextCalled = true
        return undefined
      })
      if (result instanceof Response) {
        return result
      }
      if (nextCalled) {
        return await nextHandler(ctx)
      }
      return ctx.json({ error: 'Middleware did not call next or return response' }, 500)
    }
  }

  return compiled
}

/**
 * 創建模擬 Context
 */
function createMockContext(): GravitoContext {
  return {
    req: {
      url: 'http://localhost/test',
      method: 'GET',
      path: '/test',
      query: (name: string) => undefined,
      queries: () => ({}),
      param: (name: string) => undefined,
      params: () => ({}),
      header: (name: string) => undefined,
      headers: () => ({}),
      json: async () => ({}),
      text: async () => '',
      formData: async () => new FormData(),
    } as any,
    json: (data: any, status = 200) => {
      return new Response(JSON.stringify(data), { status })
    },
    text: (data: string, status = 200) => {
      return new Response(data, { status })
    },
  } as any
}

describe('Middleware Semantics - Regression Tests (compileMiddlewareChain)', () => {
  describe('Single middleware behavior', () => {
    it('should execute handler when middleware calls next() and returns undefined', async () => {
      let middlewareRan = false
      let handlerRan = false

      const middleware: Middleware = async (c, next) => {
        middlewareRan = true
        await next()
        return undefined
      }

      const handler = async (ctx: GravitoContext) => {
        handlerRan = true
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(middlewareRan).toBe(true)
      expect(handlerRan).toBe(true)
      expect(response.status).toBe(200)
    })

    it('should return middleware Response when middleware returns Response (even after next())', async () => {
      let middlewareRan = false
      let handlerRan = false

      const middleware: Middleware = async (c, next) => {
        middlewareRan = true
        await next()
        return new Response('middleware response', { status: 201 })
      }

      const handler = async (ctx: GravitoContext) => {
        handlerRan = true
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(middlewareRan).toBe(true)
      // Middleware returns Response, so handler is not executed
      expect(handlerRan).toBe(false)
      expect(response.status).toBe(201)
      expect(await response.text()).toBe('middleware response')
    })

    it('should return 500 when middleware neither calls next() nor returns Response', async () => {
      const middleware: Middleware = async (c, next) => {
        // Not calling next(), not returning Response
      }

      const handler = async (ctx: GravitoContext) => {
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect((body as any).error).toContain('did not call next')
    })

    it('should return middleware Response when middleware returns Response without calling next()', async () => {
      const middleware: Middleware = async (c, next) => {
        return new Response('early exit', { status: 403 })
      }

      const handler = async (ctx: GravitoContext) => {
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(response.status).toBe(403)
      expect(await response.text()).toBe('early exit')
    })
  })

  describe('Multiple middleware chaining', () => {
    it('should execute all middleware when each calls next()', async () => {
      let mw1Ran = false
      let mw2Ran = false
      let handlerRan = false

      const mw1: Middleware = async (c, next) => {
        mw1Ran = true
        await next()
      }

      const mw2: Middleware = async (c, next) => {
        mw2Ran = true
        await next()
      }

      const handler = async (ctx: GravitoContext) => {
        handlerRan = true
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([mw1, mw2], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(mw1Ran).toBe(true)
      expect(mw2Ran).toBe(true)
      expect(handlerRan).toBe(true)
      expect(response.status).toBe(200)
    })

    it('should short-circuit when first middleware returns Response without calling next()', async () => {
      let mw1Ran = false
      let mw2Ran = false
      let handlerRan = false

      const mw1: Middleware = async (c, next) => {
        mw1Ran = true
        return new Response('mw1 exit', { status: 401 })
      }

      const mw2: Middleware = async (c, next) => {
        mw2Ran = true
        await next()
      }

      const handler = async (ctx: GravitoContext) => {
        handlerRan = true
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([mw1, mw2], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(mw1Ran).toBe(true)
      // mw1 should not call next, so mw2 and handler should not run
      expect(mw2Ran).toBe(false)
      expect(handlerRan).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Edge cases: falsy non-Response returns', () => {
    it('should call handler when middleware returns null after next()', async () => {
      const callOrder: string[] = []
      const middleware: Middleware = async (c, next) => {
        callOrder.push('mw')
        await next()
        return null // Falsy value
      }

      const handler = async (ctx: GravitoContext) => {
        callOrder.push('handler')
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(callOrder).toEqual(['mw', 'handler'])
      expect(response.status).toBe(200)
    })

    it('should call handler when middleware returns 0 after next()', async () => {
      const middleware: Middleware = async (c, next) => {
        await next()
        return 0
      }

      const handler = async (ctx: GravitoContext) => {
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(response.status).toBe(200)
    })

    it('should call handler when middleware returns empty string after next()', async () => {
      const middleware: Middleware = async (c, next) => {
        await next()
        return ''
      }

      const handler = async (ctx: GravitoContext) => {
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(response.status).toBe(200)
    })
  })

  describe('Edge cases: truthy non-Response returns', () => {
    it('should call handler when middleware returns string (non-Response) after next()', async () => {
      const callOrder: string[] = []
      const middleware: Middleware = async (c, next) => {
        callOrder.push('mw')
        await next()
        return 'some string' // Truthy but not Response
      }

      const handler = async (ctx: GravitoContext) => {
        callOrder.push('handler')
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(callOrder).toEqual(['mw', 'handler'])
      expect(response.status).toBe(200)
    })

    it('should return 500 when middleware returns truthy non-Response without calling next()', async () => {
      const middleware: Middleware = async (c, next) => {
        return 'some string' // Truthy but not Response, and didn't call next
      }

      const handler = async (ctx: GravitoContext) => {
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([middleware], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(response.status).toBe(500)
    })
  })

  describe('No middleware case', () => {
    it('should call handler directly when no middleware', async () => {
      const callOrder: string[] = []

      const handler = async (ctx: GravitoContext) => {
        callOrder.push('handler')
        return ctx.json({ ok: true })
      }

      const compiled = compileMiddlewareChain([], handler)
      const ctx = createMockContext()
      const response = await compiled(ctx)

      expect(callOrder).toEqual(['handler'])
      expect(response.status).toBe(200)
    })

    it('should return the compiled function reference directly for no middleware', () => {
      const handler = async (ctx: GravitoContext) => ctx.json({ ok: true })
      const compiled = compileMiddlewareChain([], handler)

      expect(compiled).toBe(handler)
    })
  })
})
