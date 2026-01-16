import { describe, expect, it, jest } from 'bun:test'
import { abort, type ErrorHandlerContext, fail, PlanetCore } from '../src/index'
import { ConsoleLogger } from '../src/Logger'

describe('Gravito Core Phase 2 Features', () => {
  describe('Logger System', () => {
    it('should use ConsoleLogger by default', () => {
      const core = new PlanetCore()
      expect(core.logger).toBeInstanceOf(ConsoleLogger)
    })

    it('should support custom logger injection', () => {
      const customLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const core = new PlanetCore({ logger: customLogger })

      core.liftoff(0)

      // liftoff should trigger an info log
      expect(customLogger.info).toHaveBeenCalled()
      // biome-ignore lint/suspicious/noExplicitAny: mock access
      expect((customLogger.info as any).mock.calls[0][0]).toContain('Ready to liftoff')
    })
  })

  describe('Config Manager', () => {
    it('should load configuration from options', () => {
      const core = new PlanetCore({
        config: {
          TEST_KEY: 'test_value',
          PORT: 9999,
        },
      })

      expect(core.config.get<string>('TEST_KEY')).toBe('test_value')
      expect(core.config.get<number>('PORT')).toBe(9999)
    })

    it('should use configured port in liftoff', () => {
      const core = new PlanetCore({
        config: {
          PORT: 0,
        },
      })

      const { port } = core.liftoff()
      expect(port).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors uniformly with JSON response', async () => {
      const core = new PlanetCore()

      // Simulate an error route
      core.router.get('/error', () => {
        throw new Error('Something went wrong')
      })

      const { fetch } = core.liftoff(0)
      const res = await fetch(new Request('http://localhost/error'))
      // biome-ignore lint/suspicious/noExplicitAny: test body
      const body = (await res.json()) as any

      expect(res.status).toBe(500)
      expect(body).toHaveProperty('success', false)
      expect(body.error.code).toBe('INTERNAL_ERROR')
    })

    it('should respect HTTPException status codes', async () => {
      const core = new PlanetCore()

      core.router.get('/forbidden', () => {
        abort(403, 'Forbidden')
      })

      const { fetch } = core.liftoff(0)
      const res = await fetch(new Request('http://localhost/forbidden'))
      // biome-ignore lint/suspicious/noExplicitAny: test body
      const body = (await res.json()) as any

      expect(res.status).toBe(403)
      expect(body).toHaveProperty('success', false)
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.error.message).toBe('Forbidden')
    })

    it('should allow custom error:render override', async () => {
      const core = new PlanetCore()

      core.hooks.addFilter('error:render', (_current: Response | null, ctx: unknown) => {
        const errorCtx = ctx as ErrorHandlerContext
        return errorCtx.c.json({ custom: true, code: errorCtx.payload.error.code }, 418)
      })

      core.router.get('/boom', () => {
        throw new Error('Boom')
      })

      const { fetch } = core.liftoff(0)
      const res = await fetch(new Request('http://localhost/boom'))
      // biome-ignore lint/suspicious/noExplicitAny: test body
      const body = (await res.json()) as any

      expect(res.status).toBe(418)
      expect(body.custom).toBe(true)
      expect(body.code).toBe('INTERNAL_ERROR')
    })

    it('should allow error:context to modify status and payload', async () => {
      const core = new PlanetCore()

      core.hooks.addFilter('error:context', (ctx: ErrorHandlerContext) => {
        ctx.status = 400
        ctx.payload = fail('Bad Request', 'BAD_REQUEST')
        return ctx
      })

      core.router.get('/bad', () => {
        throw new Error('Nope')
      })

      const { fetch } = core.liftoff(0)
      const res = await fetch(new Request('http://localhost/bad'))
      // biome-ignore lint/suspicious/noExplicitAny: test body
      const body = (await res.json()) as any

      expect(res.status).toBe(400)
      expect(body.error.code).toBe('BAD_REQUEST')
      expect(body.error.message).toBe('Bad Request')
    })

    it('should return 404 for unknown routes', async () => {
      const core = new PlanetCore()
      const { fetch } = core.liftoff(0)

      const res = await fetch(new Request('http://localhost/unknown-xyz'))
      // biome-ignore lint/suspicious/noExplicitAny: test body
      const body = (await res.json()) as any

      expect(res.status).toBe(404)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('should use status-based message for HTTPException without message', async () => {
      const core = new PlanetCore()

      core.router.get('/missing', () => {
        abort(404)
      })

      const { fetch } = core.liftoff(0)
      const res = await fetch(new Request('http://localhost/missing'))
      // biome-ignore lint/suspicious/noExplicitAny: test body
      const body = (await res.json()) as any

      expect(res.status).toBe(404)
      expect(body.error.code).toBe('NOT_FOUND')
      expect(body.error.message).toBe('Not Found')
    })

    it('should not leak internal error messages in production', async () => {
      const previousNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const core = new PlanetCore()

        core.router.get('/error', () => {
          throw new Error('Sensitive internal details')
        })

        const { fetch } = core.liftoff(0)
        const res = await fetch(new Request('http://localhost/error'))
        // biome-ignore lint/suspicious/noExplicitAny: test body
        const body = (await res.json()) as any

        expect(res.status).toBe(500)
        expect(body.error.code).toBe('INTERNAL_ERROR')
        expect(body.error.message).toBe('Internal Server Error')
        expect(body.error.details).toBeUndefined()
      } finally {
        if (previousNodeEnv === undefined) {
          delete process.env.NODE_ENV
        } else {
          process.env.NODE_ENV = previousNodeEnv
        }
      }
    })

    it('should handle process-level errors (unhandledRejection) via global handlers', async () => {
      const reportSpy = jest.fn()
      const customLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const core = new PlanetCore({ logger: customLogger })
      core.hooks.addAction('processError:report', reportSpy)

      const before = process.listeners('unhandledRejection').length
      const unregister1 = core.registerGlobalErrorHandlers({ mode: 'log' })

      const afterRegister = process.listeners('unhandledRejection').length
      expect(afterRegister).toBe(before + 1)

      const unregister2 = core.registerGlobalErrorHandlers({ mode: 'log' })
      const afterSecondRegister = process.listeners('unhandledRejection').length
      expect(afterSecondRegister).toBe(afterRegister)

      process.emit('unhandledRejection', new Error('Unhandled'), Promise.resolve())
      await new Promise((r) => setTimeout(r, 0))

      expect(customLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[unhandledRejection]'),
        expect.any(Error)
      )
      expect(reportSpy).toHaveBeenCalled()

      unregister2()
      unregister1()

      const afterUnregister = process.listeners('unhandledRejection').length
      expect(afterUnregister).toBe(before)
    })
  })
})
