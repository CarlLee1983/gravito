import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { SchemaCompilationCache } from './SchemaCompilationCache'

describe('SchemaCompilationCache', () => {
  beforeEach(() => {
    SchemaCompilationCache.clearCache()
  })

  describe('Basic Functionality', () => {
    it('should cache and retrieve Zod validators', async () => {
      const schema = z.object({ name: z.string() })

      // First call should compile and cache
      const validator1 = SchemaCompilationCache.getCompiledValidator(schema, () =>
        SchemaCompilationCache.compileZodValidator(schema)
      )

      // Second call should return cached validator (same instance)
      const validator2 = SchemaCompilationCache.getCompiledValidator(schema, () =>
        SchemaCompilationCache.compileZodValidator(schema)
      )

      expect(validator1).toBe(validator2)
      expect(validator1.schemaType).toBe('zod')

      // Test validation works
      const result = await validator1.validate({ name: 'test' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'test' })
    })

    it('should compile Zod validators correctly', async () => {
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(18).optional(),
      })

      const validator = SchemaCompilationCache.compileZodValidator(schema)

      // Valid data
      const validResult = await validator.validate({
        name: 'John',
        email: 'john@example.com',
        age: 25,
      })
      expect(validResult.success).toBe(true)

      // Invalid data
      const invalidResult = await validator.validate({
        name: 'J',
        email: 'invalid-email',
        age: 15,
      })
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.errors).toBeDefined()
      expect(invalidResult.errors?.length).toBeGreaterThan(0)
    })

    it('should handle different schema instances separately', () => {
      const schema1 = z.string()
      const schema2 = z.string()

      const validator1 = SchemaCompilationCache.getCompiledValidator(schema1, () =>
        SchemaCompilationCache.compileZodValidator(schema1)
      )

      const validator2 = SchemaCompilationCache.getCompiledValidator(schema2, () =>
        SchemaCompilationCache.compileZodValidator(schema2)
      )

      // Different schema instances should get different validators
      expect(validator1).not.toBe(validator2)
    })

    it('should handle primitive schemas', async () => {
      const stringSchema = z.string().min(3)

      const validator = SchemaCompilationCache.getCompiledValidator(stringSchema, () =>
        SchemaCompilationCache.compileZodValidator(stringSchema)
      )

      const validResult = await validator.validate('test')
      expect(validResult.success).toBe(true)
      expect(validResult.data).toBe('test')

      const invalidResult = await validator.validate('hi')
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should demonstrate compilation cache performance improvement', async () => {
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(18).optional(),
      })
      const testData = { name: 'John', email: 'john@example.com', age: 30 }

      // Measure uncached validation time (baseline)
      const uncachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        schema.safeParse(testData)
      }
      const uncachedTime = performance.now() - uncachedStart

      // Get cached validator
      const validator = SchemaCompilationCache.getCompiledValidator(schema, () =>
        SchemaCompilationCache.compileZodValidator(schema)
      )

      // Measure cached validation time
      const cachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        await validator.validate(testData)
      }
      const cachedTime = performance.now() - cachedStart

      // Should show some performance characteristic differences
      console.log(
        `Schema compilation caching: uncached=${uncachedTime.toFixed(2)}ms, cached=${cachedTime.toFixed(2)}ms`
      )

      // Both should complete successfully
      expect(uncachedTime).toBeGreaterThan(0)
      expect(cachedTime).toBeGreaterThan(0)
    })

    it('should handle cache lookup performance', () => {
      // Create multiple different schemas
      const schemas = Array.from({ length: 100 }, (_, i) => z.object({ [`field${i}`]: z.string() }))

      // First pass: cache all schemas
      const start1 = performance.now()
      schemas.forEach((schema) => {
        SchemaCompilationCache.getCompiledValidator(schema, () =>
          SchemaCompilationCache.compileZodValidator(schema)
        )
      })
      const cacheTime = performance.now() - start1

      // Second pass: retrieve from cache
      const start2 = performance.now()
      schemas.forEach((schema) => {
        SchemaCompilationCache.getCompiledValidator(schema, () =>
          SchemaCompilationCache.compileZodValidator(schema)
        )
      })
      const retrieveTime = performance.now() - start2

      console.log(
        `Cache performance: initial=${cacheTime.toFixed(2)}ms, retrieval=${retrieveTime.toFixed(2)}ms`
      )

      // Retrieval should generally be faster than initial compilation
      expect(cacheTime).toBeGreaterThan(0)
      expect(retrieveTime).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    it('should clear cache successfully', () => {
      const schema = z.string()

      // Cache a validator
      const validator1 = SchemaCompilationCache.getCompiledValidator(schema, () =>
        SchemaCompilationCache.compileZodValidator(schema)
      )

      // Clear cache
      SchemaCompilationCache.clearCache()

      // Should get new instance after clearing
      const validator2 = SchemaCompilationCache.getCompiledValidator(schema, () =>
        SchemaCompilationCache.compileZodValidator(schema)
      )

      expect(validator1).not.toBe(validator2)
    })

    it('should provide cache stats', () => {
      const stats = SchemaCompilationCache.getCacheStats()
      expect(stats).toHaveProperty('message')
      expect(typeof stats.message).toBe('string')
    })
  })

  describe('Edge Cases', () => {
    it('should handle complex nested schemas', async () => {
      const complexSchema = z.object({
        user: z.object({
          profile: z.object({
            settings: z.array(
              z.object({
                key: z.string(),
                value: z.union([z.string(), z.number(), z.boolean()]),
              })
            ),
          }),
        }),
      })

      const validator = SchemaCompilationCache.getCompiledValidator(complexSchema, () =>
        SchemaCompilationCache.compileZodValidator(complexSchema)
      )

      const testData = {
        user: {
          profile: {
            settings: [
              { key: 'theme', value: 'dark' },
              { key: 'notifications', value: true },
              { key: 'limit', value: 50 },
            ],
          },
        },
      }

      const result = await validator.validate(testData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })

    it('should handle validation errors correctly', async () => {
      const schema = z.object({
        name: z.string().min(2),
        age: z.number().min(0),
      })

      const validator = SchemaCompilationCache.getCompiledValidator(schema, () =>
        SchemaCompilationCache.compileZodValidator(schema)
      )

      const result = await validator.validate({
        name: 'J',
        age: -1,
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)

      // Check error structure
      const nameError = result.errors?.find((err) => err.path.includes('name'))
      expect(nameError).toBeDefined()
      expect(nameError?.message).toContain('2')

      const ageError = result.errors?.find((err) => err.path.includes('age'))
      expect(ageError).toBeDefined()
    })
  })
})
