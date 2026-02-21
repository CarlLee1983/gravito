import { describe, expect, it } from 'bun:test'
import { RequestContext, type RequestContextData } from '../src/RequestContext'

describe('RequestContext', () => {
  describe('run()', () => {
    it('should store and retrieve context data in async chain', async () => {
      const data: RequestContextData = {
        requestId: 'req-123',
        userId: 'user-456',
      }

      const result = await RequestContext.run(data, async () => {
        const context = RequestContext.get()
        return context?.requestId
      })

      expect(result).toBe('req-123')
    })

    it('should maintain context through nested async calls', async () => {
      const data: RequestContextData = {
        requestId: 'req-789',
        tenantId: 'tenant-001',
      }

      const result = await RequestContext.run(data, async () => {
        const ctx1 = RequestContext.get()

        // Nested async operation
        await new Promise((resolve) => setTimeout(resolve, 10))

        const ctx2 = RequestContext.get()
        return ctx1?.requestId === ctx2?.requestId
      })

      expect(result).toBe(true)
    })

    it('should return the result of synchronous functions', async () => {
      const data: RequestContextData = { requestId: 'sync-req' }

      const result = await Promise.resolve(
        RequestContext.run(data, () => {
          return 'sync-result'
        })
      )

      expect(result).toBe('sync-result')
    })

    it('should isolate context between concurrent async chains', async () => {
      const data1: RequestContextData = { requestId: 'req-1' }
      const data2: RequestContextData = { requestId: 'req-2' }

      const [result1, result2] = await Promise.all([
        RequestContext.run(data1, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return RequestContext.get()?.requestId
        }),
        RequestContext.run(data2, async () => {
          return RequestContext.get()?.requestId
        }),
      ])

      expect(result1).toBe('req-1')
      expect(result2).toBe('req-2')
    })

    it('should support custom fields in context', async () => {
      const data: RequestContextData = {
        requestId: 'req-001',
        userId: 'user-123',
        custom: 'custom-value',
      }

      const result = await RequestContext.run(data, async () => {
        return RequestContext.get()?.custom
      })

      expect(result).toBe('custom-value')
    })
  })

  describe('get()', () => {
    it('should return undefined when no context is set', () => {
      const context = RequestContext.get()
      expect(context).toBeUndefined()
    })

    it('should return context data when set', async () => {
      const data: RequestContextData = {
        requestId: 'req-get-test',
        userId: 'user-get-test',
      }

      await RequestContext.run(data, async () => {
        const context = RequestContext.get()
        expect(context).toEqual(data)
      })
    })

    it('should return undefined outside of context', async () => {
      await RequestContext.run({ requestId: 'inside' }, () => {})

      // Outside the context
      const context = RequestContext.get()
      expect(context).toBeUndefined()
    })
  })

  describe('getOrThrow()', () => {
    it('should return context when available', async () => {
      const data: RequestContextData = {
        requestId: 'req-throw-test',
        traceId: 'trace-001',
      }

      await RequestContext.run(data, async () => {
        const context = RequestContext.getOrThrow()
        expect(context.requestId).toBe('req-throw-test')
      })
    })

    it('should throw error when context is not available', () => {
      expect(() => RequestContext.getOrThrow()).toThrow(
        'RequestContext is not available in the current async context'
      )
    })

    it('should throw error outside of context chain', async () => {
      await RequestContext.run({ requestId: 'inside' }, () => {})

      expect(() => RequestContext.getOrThrow()).toThrow(
        'RequestContext is not available in the current async context'
      )
    })
  })

  describe('set()', () => {
    it('should set a value in the current context', async () => {
      const data: RequestContextData = { requestId: 'req-set-test' }

      await RequestContext.run(data, async () => {
        RequestContext.set('userId', 'new-user-123')
        const context = RequestContext.get()
        expect(context?.userId).toBe('new-user-123')
      })
    })

    it('should allow modifying existing context fields', async () => {
      const data: RequestContextData = {
        requestId: 'req-modify',
        userId: 'original-user',
      }

      await RequestContext.run(data, async () => {
        RequestContext.set('userId', 'modified-user')
        const context = RequestContext.getOrThrow()
        expect(context.userId).toBe('modified-user')
      })
    })

    it('should support adding custom fields via set()', async () => {
      const data: RequestContextData = { requestId: 'req-custom-field' }

      await RequestContext.run(data, async () => {
        RequestContext.set('correlationId', 'corr-001')
        RequestContext.set('metadata', { key: 'value' })

        const context = RequestContext.getOrThrow()
        expect(context.correlationId).toBe('corr-001')
        expect(context.metadata).toEqual({ key: 'value' })
      })
    })

    it('should throw error when setting value outside context', () => {
      expect(() => RequestContext.set('userId', 'user-123')).toThrow(
        'RequestContext is not available in the current async context'
      )
    })

    it('should throw error when setting value after context ends', async () => {
      await RequestContext.run({ requestId: 'req-ended' }, () => {})

      expect(() => RequestContext.set('userId', 'user-123')).toThrow(
        'RequestContext is not available in the current async context'
      )
    })
  })

  describe('Multiple concurrent contexts', () => {
    it('should keep contexts completely isolated', async () => {
      const results: { id: string; userId?: string }[] = []

      await Promise.all([
        RequestContext.run({ requestId: 'req-a', userId: 'user-a' }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 20))
          const ctx = RequestContext.getOrThrow()
          results.push({ id: ctx.requestId, userId: ctx.userId })
        }),
        RequestContext.run({ requestId: 'req-b', userId: 'user-b' }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          const ctx = RequestContext.getOrThrow()
          results.push({ id: ctx.requestId, userId: ctx.userId })
        }),
        RequestContext.run({ requestId: 'req-c', userId: 'user-c' }, async () => {
          const ctx = RequestContext.getOrThrow()
          results.push({ id: ctx.requestId, userId: ctx.userId })
        }),
      ])

      expect(results).toContainEqual({ id: 'req-a', userId: 'user-a' })
      expect(results).toContainEqual({ id: 'req-b', userId: 'user-b' })
      expect(results).toContainEqual({ id: 'req-c', userId: 'user-c' })
    })
  })
})
