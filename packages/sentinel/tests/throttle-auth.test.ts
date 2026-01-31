import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext, GravitoNext } from '@gravito/core'
import { throttleAuth } from '../src/middleware/throttleAuth'

describe('throttleAuth middleware', () => {
  const createMockContext = (ip = '127.0.0.1') => {
    const res = { status: 200 }
    const ctx = {
      req: {
        header: mock((name?: string) => {
          if (name === 'x-forwarded-for') {
            return ip
          }
          return {} as any
        }),
      },
      res,
      header: mock(() => {}),
      status: mock((code: number) => {
        res.status = code
      }),
      json: mock((body: any, status: number) => {
        if (status) {
          res.status = status
        }
        return body
      }),
    }
    return ctx as unknown as GravitoContext
  }

  it('allows requests under the limit', async () => {
    const middleware = throttleAuth({ maxAttempts: 2 })
    const ctx = createMockContext()
    const next: GravitoNext = mock(async () => {})

    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.json).not.toHaveBeenCalledWith(expect.anything(), 429)
  })

  it('blocks requests after max attempts (401s)', async () => {
    const middleware = throttleAuth({ maxAttempts: 1, decayMinutes: 1 })
    const ctx = createMockContext()
    const next: GravitoNext = mock(async () => {
      return new Response(null, { status: 401 })
    })

    await middleware(ctx, next)
    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(expect.anything(), 429)
    expect(ctx.header).toHaveBeenCalledWith('Retry-After', expect.anything())
  })

  it('resets after decay period', async () => {
    const middleware = throttleAuth({ maxAttempts: 1, decayMinutes: -1 })
    const ctx = createMockContext()
    const next: GravitoNext = mock(async () => {
      return new Response(null, { status: 401 })
    })

    await middleware(ctx, next)
    await middleware(ctx, next)

    expect(ctx.json).not.toHaveBeenCalledWith(expect.anything(), 429)
  })
})
