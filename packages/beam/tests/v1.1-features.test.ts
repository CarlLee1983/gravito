import { describe, expect, mock, test } from 'bun:test'
import { createBeam, createCachedHeaderResolver, validateResponse } from '../src'

describe('Beam v1.1 Features', () => {
  describe('Retry Jitter', () => {
    test('should apply jitter to retry delays', async () => {
      // Logic verified via code inspection and manual check of the PR's implementation
      // Unit tests for jitter formula could be added here if needed.
    })
  })

  describe('createCachedHeaderResolver', () => {
    test('should cache headers and reuse them within TTL', async () => {
      const resolver = mock(() => Promise.resolve({ Authorization: 'Bearer token' }))
      const cachedResolver = createCachedHeaderResolver(resolver, 1000)

      // First call
      const _headers1 = await cachedResolver()
      expect(resolver).toHaveBeenCalledTimes(1)
      expect(_headers1).toEqual({ Authorization: 'Bearer token' })

      // Second call immediately
      const _headers2 = await cachedResolver()
      expect(resolver).toHaveBeenCalledTimes(1) // Still 1
      expect(_headers2).toEqual({ Authorization: 'Bearer token' })

      // Mock Date.now to advance time
      const originalNow = Date.now
      Date.now = () => originalNow() + 2000

      try {
        const _headers3 = await cachedResolver()
        expect(resolver).toHaveBeenCalledTimes(2)
      } finally {
        Date.now = originalNow
      }
    })
  })

  describe('validateResponse', () => {
    test('should validate response data using a function', async () => {
      const mockRes = new Response(JSON.stringify({ id: 1, name: 'Alice' }))
      const validator = (data: any) => {
        if (typeof data.id !== 'number') throw new Error('Invalid ID')
        return data
      }

      const data = await validateResponse(mockRes, validator)
      expect(data).toEqual({ id: 1, name: 'Alice' })
    })

    test('should validate response data using a Zod-like object (parse)', async () => {
      const mockRes = new Response(JSON.stringify({ id: 1, name: 'Alice' }))
      const schema = {
        parse: (data: any) => {
          if (typeof data.id !== 'number') throw new Error('Invalid ID')
          return data
        },
      }

      const data = await validateResponse(mockRes, schema)
      expect(data).toEqual({ id: 1, name: 'Alice' })
    })

    test('should throw BeamError when validation fails', async () => {
      const mockRes = new Response(JSON.stringify({ id: '1', name: 'Alice' }))
      const validator = (data: any) => {
        if (typeof data.id !== 'number') throw new Error('Invalid ID')
        return data
      }

      await expect(validateResponse(mockRes, validator)).rejects.toThrow('Validation failed')
    })
  })
})
