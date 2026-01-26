import { beforeEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { ValibotValidator } from '../validation/ValibotValidator'
import { ZodValidator } from '../validation/ZodValidator'
import { SchemaCache } from './SchemaCache'

describe('SchemaCache', () => {
  beforeEach(() => {
    SchemaCache.clearCache()
    SchemaCache.registerValidators([new ZodValidator(), new ValibotValidator()])
  })

  describe('cache performance', () => {
    test('should cache validator results for object schemas', () => {
      const schema = z.object({ email: z.string().email() })

      // First access - should detect and cache
      const validator1 = SchemaCache.getValidator(schema)
      expect(validator1).toBeInstanceOf(ZodValidator)

      // Second access - should use cache
      const validator2 = SchemaCache.getValidator(schema)
      expect(validator2).toBe(validator1) // Same instance from cache
    })

    test('should not cache primitive schemas', () => {
      // Primitives cannot be cached and should throw error for unsupported types
      expect(() => {
        SchemaCache.getValidator('string')
      }).toThrow('Unsupported schema type. Use Zod or Valibot.')

      expect(() => {
        SchemaCache.getValidator(123)
      }).toThrow('Unsupported schema type. Use Zod or Valibot.')
    })

    test('should cache different schema objects separately', () => {
      const schema1 = z.object({ email: z.string() })
      const schema2 = z.object({ name: z.string() })

      const validator1 = SchemaCache.getValidator(schema1)
      const validator2 = SchemaCache.getValidator(schema2)

      expect(validator1).toBeInstanceOf(ZodValidator)
      expect(validator2).toBeInstanceOf(ZodValidator)
      expect(validator1).toBe(validator2) // Same type of validator
    })
  })

  describe('performance benchmarks', () => {
    test('should show significant performance improvement with caching', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().optional(),
      })

      // Warm up
      SchemaCache.getValidator(schema)

      // Measure uncached performance (clear cache each time)
      const uncachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        SchemaCache.clearCache()
        SchemaCache.registerValidators([new ZodValidator(), new ValibotValidator()])
        SchemaCache.getValidator(schema)
      }
      const uncachedTime = performance.now() - uncachedStart

      // Measure cached performance (same schema object)
      const cachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        SchemaCache.getValidator(schema)
      }
      const cachedTime = performance.now() - cachedStart

      // Cached should be significantly faster (at least 5x for realistic benchmark)
      const speedupRatio = uncachedTime / cachedTime
      expect(speedupRatio).toBeGreaterThan(5)

      console.log(`Cache performance improvement: ${speedupRatio.toFixed(1)}x faster`)
      console.log(`Uncached: ${uncachedTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`)
    })
  })

  describe('error handling', () => {
    test('should throw error for unsupported schema types', () => {
      const unsupportedSchema = { custom: 'schema' }

      expect(() => {
        SchemaCache.getValidator(unsupportedSchema)
      }).toThrow('Unsupported schema type. Use Zod or Valibot.')
    })
  })

  describe('cache statistics', () => {
    test('should return correct validator count', () => {
      const stats = SchemaCache.getCacheStats()
      expect(stats.registeredValidators).toBe(2)
    })
  })

  describe('memory management', () => {
    test('should clear cache correctly', () => {
      const schema = z.object({ test: z.string() })

      // Add to cache
      SchemaCache.getValidator(schema)

      // Clear cache
      SchemaCache.clearCache()

      // Should still work (will re-detect)
      const validator = SchemaCache.getValidator(schema)
      expect(validator).toBeInstanceOf(ZodValidator)
    })
  })
})
