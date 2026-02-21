import { describe, expect, it } from 'bun:test'
import { FastContext } from '../src/engine/FastContext'
import { MinimalContext } from '../src/engine/MinimalContext'

describe('Body Caching - FastContext', () => {
  describe('json() caching', () => {
    it('should cache JSON body on first parse', async () => {
      const body = JSON.stringify({ id: 1, name: 'test' })
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body,
      })

      const ctx = new FastContext()
      ctx.init(request)

      const first = await ctx.req.json()
      const second = await ctx.req.json()

      expect(first).toEqual({ id: 1, name: 'test' })
      expect(first).toBe(second) // Same object reference (cached)
      expect(first.id).toBe(1)
    })

    it('should not trigger request body reading twice', async () => {
      let readCount = 0
      const body = JSON.stringify({ counter: 1 })
      const originalJson = Request.prototype.json

      // @ts-expect-error - monkey-patching for test
      Request.prototype.json = async function (this: Request) {
        readCount++
        return originalJson.call(this)
      }

      try {
        const request = new Request('http://localhost/api/test', {
          method: 'POST',
          body,
        })

        const ctx = new FastContext()
        ctx.init(request)

        await ctx.req.json()
        await ctx.req.json()
        await ctx.req.json()

        expect(readCount).toBe(1) // Only called once due to caching
      } finally {
        // @ts-expect-error
        Request.prototype.json = originalJson
      }
    })
  })

  describe('text() caching', () => {
    it('should cache text body on first parse', async () => {
      const body = 'Hello World'
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body,
      })

      const ctx = new FastContext()
      ctx.init(request)

      const first = await ctx.req.text()
      const second = await ctx.req.text()

      expect(first).toBe('Hello World')
      expect(first).toBe(second) // Same value (cached)
    })

    it('should not trigger request body reading twice for text', async () => {
      let readCount = 0
      const body = 'Test content'
      const originalText = Request.prototype.text

      // @ts-expect-error
      Request.prototype.text = async function (this: Request) {
        readCount++
        return originalText.call(this)
      }

      try {
        const request = new Request('http://localhost/api/test', {
          method: 'POST',
          body,
        })

        const ctx = new FastContext()
        ctx.init(request)

        await ctx.req.text()
        await ctx.req.text()
        await ctx.req.text()

        expect(readCount).toBe(1) // Only called once
      } finally {
        // @ts-expect-error
        Request.prototype.text = originalText
      }
    })
  })

  describe('formData() caching', () => {
    it('should cache formData body on first parse', async () => {
      const formData = new FormData()
      formData.append('field1', 'value1')
      formData.append('field2', 'value2')

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: formData,
      })

      const ctx = new FastContext()
      ctx.init(request)

      const first = await ctx.req.formData()
      const second = await ctx.req.formData()

      expect(first).toBe(second) // Same object reference (cached)
      expect(first.get('field1')).toBe('value1')
      expect(first.get('field2')).toBe('value2')
    })

    it('should not trigger request body reading twice for formData', async () => {
      let readCount = 0
      const formData = new FormData()
      formData.append('test', 'data')
      const originalFormData = Request.prototype.formData

      // @ts-expect-error
      Request.prototype.formData = async function (this: Request) {
        readCount++
        return originalFormData.call(this)
      }

      try {
        const request = new Request('http://localhost/api/test', {
          method: 'POST',
          body: formData,
        })

        const ctx = new FastContext()
        ctx.init(request)

        await ctx.req.formData()
        await ctx.req.formData()

        expect(readCount).toBe(1) // Only called once
      } finally {
        // @ts-expect-error
        Request.prototype.formData = originalFormData
      }
    })
  })

  describe('reset() clears cache', () => {
    it('should clear JSON cache on reset', async () => {
      const request1 = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ id: 1 }),
      })

      const ctx = new FastContext()
      ctx.init(request1)

      const first = await ctx.req.json()
      expect(first.id).toBe(1)

      // Reset the context
      ctx.reset()

      // Initialize with new request
      const request2 = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ id: 2 }),
      })
      ctx.init(request2)

      const second = await ctx.req.json()
      expect(second.id).toBe(2) // Should parse new request, not return old cache
    })

    it('should clear text cache on reset', async () => {
      const ctx = new FastContext()

      const request1 = new Request('http://localhost/api/test', {
        method: 'POST',
        body: 'First text',
      })
      ctx.init(request1)
      const first = await ctx.req.text()
      expect(first).toBe('First text')

      ctx.reset()

      const request2 = new Request('http://localhost/api/test', {
        method: 'POST',
        body: 'Second text',
      })
      ctx.init(request2)
      const second = await ctx.req.text()
      expect(second).toBe('Second text')
    })

    it('should clear formData cache on reset', async () => {
      const ctx = new FastContext()

      const formData1 = new FormData()
      formData1.append('key', 'value1')

      const request1 = new Request('http://localhost/api/test', {
        method: 'POST',
        body: formData1,
      })
      ctx.init(request1)
      const first = await ctx.req.formData()
      expect(first.get('key')).toBe('value1')

      ctx.reset()

      const formData2 = new FormData()
      formData2.append('key', 'value2')

      const request2 = new Request('http://localhost/api/test', {
        method: 'POST',
        body: formData2,
      })
      ctx.init(request2)
      const second = await ctx.req.formData()
      expect(second.get('key')).toBe('value2')
    })
  })
})

describe('Body Caching - MinimalContext', () => {
  describe('json() Promise caching', () => {
    it('should cache JSON promise to avoid multiple reads', async () => {
      const body = JSON.stringify({ id: 1, name: 'test' })
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body,
      })

      const ctx = new MinimalContext(request, {}, '/api/test')

      const first = await ctx.req.json()
      const second = await ctx.req.json()

      expect(first).toEqual({ id: 1, name: 'test' })
      expect(first).toBe(second)
    })
  })

  describe('text() Promise caching', () => {
    it('should cache text promise to avoid multiple reads', async () => {
      const body = 'Hello MinimalContext'
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body,
      })

      const ctx = new MinimalContext(request, {}, '/api/test')

      const first = await ctx.req.text()
      const second = await ctx.req.text()

      expect(first).toBe('Hello MinimalContext')
      expect(first).toBe(second)
    })
  })

  describe('formData() Promise caching', () => {
    it('should cache formData promise to avoid multiple reads', async () => {
      const formData = new FormData()
      formData.append('field', 'value')

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: formData,
      })

      const ctx = new MinimalContext(request, {}, '/api/test')

      const first = await ctx.req.formData()
      const second = await ctx.req.formData()

      expect(first).toBe(second)
      expect(first.get('field')).toBe('value')
    })
  })
})

describe('Body Caching - Cross-context', () => {
  it('FastContext and MinimalContext should both support json caching', async () => {
    const fastBody = JSON.stringify({ type: 'fast' })
    const minimalBody = JSON.stringify({ type: 'minimal' })

    const fastRequest = new Request('http://localhost/api/test', {
      method: 'POST',
      body: fastBody,
    })

    const minimalRequest = new Request('http://localhost/api/test', {
      method: 'POST',
      body: minimalBody,
    })

    const fastCtx = new FastContext()
    fastCtx.init(fastRequest)

    const minimalCtx = new MinimalContext(minimalRequest, {}, '/api/test')

    const fastJson = await fastCtx.req.json()
    const minimalJson = await minimalCtx.req.json()

    expect(fastJson.type).toBe('fast')
    expect(minimalJson.type).toBe('minimal')

    // Both should be cached now
    const fastJson2 = await fastCtx.req.json()
    const minimalJson2 = await minimalCtx.req.json()

    expect(fastJson).toBe(fastJson2)
    expect(minimalJson).toBe(minimalJson2)
  })
})
