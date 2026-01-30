import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { getStableSchemaKey, stableHash } from '../src/hash'

describe('Stable Hash', () => {
  test('should produce consistent hash for same string', () => {
    const input = 'test-string'
    const hash1 = stableHash(input)
    const hash2 = stableHash(input)

    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^hash:/)
  })

  test('should produce different hashes for different strings', () => {
    const hash1 = stableHash('string1')
    const hash2 = stableHash('string2')

    expect(hash1).not.toBe(hash2)
  })

  test('should handle objects consistently', () => {
    const obj = { foo: 'bar', baz: 123 }
    const hash1 = stableHash(obj)
    const hash2 = stableHash(obj)

    expect(hash1).toBe(hash2)
  })
})

describe('Stable Schema Key', () => {
  test('same schema should produce identical key', () => {
    const schema1 = z.object({ id: z.number(), name: z.string() })
    const schema2 = z.object({ id: z.number(), name: z.string() })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
  })

  test('different schemas should produce different keys', () => {
    const schema1 = z.object({ id: z.number() })
    const schema2 = z.object({ name: z.string() })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).not.toBe(key2)
  })

  test('array schema should include item type in key', () => {
    const itemSchema = z.object({ id: z.number() })
    const arraySchema = z.array(itemSchema)

    const key = getStableSchemaKey(arraySchema)
    expect(key).toContain('arr:')
  })

  test('key should be deterministic across multiple calls', () => {
    const schema = z.object({ email: z.string().email() })
    const results = Array.from({ length: 100 }, () => getStableSchemaKey(schema))

    expect(new Set(results).size).toBe(1)
  })

  test('should handle nested objects', () => {
    const schema1 = z.object({
      user: z.object({
        id: z.number(),
        profile: z.object({
          name: z.string(),
        }),
      }),
    })

    const schema2 = z.object({
      user: z.object({
        id: z.number(),
        profile: z.object({
          name: z.string(),
        }),
      }),
    })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
  })

  test('should handle optional fields', () => {
    const schema1 = z.object({ id: z.number().optional() })
    const schema2 = z.object({ id: z.number().optional() })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
    expect(key1).toContain('opt:')
  })

  test('should differentiate between optional and required fields', () => {
    const schema1 = z.object({ id: z.number() })
    const schema2 = z.object({ id: z.number().optional() })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).not.toBe(key2)
  })

  test('should handle basic types correctly', () => {
    expect(getStableSchemaKey(z.string())).toBe('str')
    expect(getStableSchemaKey(z.number())).toBe('num')
    expect(getStableSchemaKey(z.boolean())).toBe('bool')
  })

  test('should handle array of primitives', () => {
    const schema = z.array(z.string())
    const key = getStableSchemaKey(schema)

    expect(key).toBe('arr:str')
  })

  test('should handle nullable fields', () => {
    const schema1 = z.string().nullable()
    const schema2 = z.string().nullable()

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
  })

  test('should handle union types', () => {
    const schema1 = z.union([z.string(), z.number()])
    const schema2 = z.union([z.string(), z.number()])

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
  })

  test('field order should not affect key', () => {
    // Zod objects with different field definition order
    const schema1 = z.object({ a: z.string(), b: z.number(), c: z.boolean() })
    const schema2 = z.object({ c: z.boolean(), a: z.string(), b: z.number() })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
  })

  test('should handle non-Zod schemas with fallback', () => {
    const plainObject = { type: 'object' }
    const key = getStableSchemaKey(plainObject)

    expect(key).toMatch(/^hash:/)
  })
})
