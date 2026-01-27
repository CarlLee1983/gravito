import { describe, expect, it } from 'bun:test'
import { LogBuffer } from '../bridges/LogBuffer'
import { JsonSerializer, MsgPackSerializer } from '../utils/Serializer'
import { MockRedis } from './mock-redis'

describe('Performance Optimizations', () => {
  describe('Serializers', () => {
    const testData = { foo: 'bar', numbers: [1, 2, 3], nested: { a: 1 } }

    it('JsonSerializer should correctly serialize and deserialize', () => {
      const serializer = new JsonSerializer()
      const serialized = serializer.serialize(testData)
      expect(typeof serialized).toBe('string')
      expect(serializer.deserialize(serialized)).toEqual(testData)
    })

    it('MsgPackSerializer should correctly serialize and deserialize', () => {
      const serializer = new MsgPackSerializer()
      const serialized = serializer.serialize(testData)
      expect(serialized instanceof Buffer || serialized instanceof Uint8Array).toBe(true)
      expect(serializer.deserialize(serialized)).toEqual(testData)
    })
  })

  describe('LogBuffer Smart Truncation', () => {
    it('should truncate large data field', async () => {
      const mockRedis = new MockRedis() as any
      const maxPayloadSize = 100
      const buffer = new LogBuffer(mockRedis, 'test:', {
        batchSize: 1,
        flushInterval: 1000,
        maxPayloadSize,
      })

      const largeData = 'a'.repeat(200)
      const log = {
        level: 'info' as const,
        message: 'test',
        jobId: '123',
        context: {
          event: 'completed',
          data: { payload: largeData },
        },
        timestamp: new Date().toISOString(),
      }

      // @ts-expect-error - accessing private for verification
      const processed = buffer.truncateLog(log)

      expect(JSON.stringify(processed).length).toBeLessThan(JSON.stringify(log).length)
      expect(processed.context?.data._truncated).toBe(true)
      expect(processed.context?.data.summary).toBeDefined()
    })

    it('should truncate large error field', async () => {
      const mockRedis = new MockRedis() as any
      const buffer = new LogBuffer(mockRedis, 'test:', {
        batchSize: 1,
        flushInterval: 1000,
        maxPayloadSize: 100,
      })

      const largeError = 'Error: ' + 'x'.repeat(200)
      const log = {
        level: 'error' as const,
        message: 'test',
        jobId: '123',
        context: {
          event: 'failed',
          error: largeError,
        },
        timestamp: new Date().toISOString(),
      }

      // @ts-expect-error
      const processed = buffer.truncateLog(log)

      expect(processed.context?.error).toContain('[TRUNCATED]')
      expect(processed.context?.error.length).toBeLessThan(largeError.length + 20)
    })
  })
})
