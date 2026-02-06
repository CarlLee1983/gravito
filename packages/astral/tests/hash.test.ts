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

  test('should handle ZodDate', () => {
    const schema = z.date()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('date')
  })

  test('should handle ZodBigInt', () => {
    const schema = z.bigint()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('bigint')
  })

  test('should handle ZodUndefined', () => {
    const schema = z.undefined()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('undefined')
  })

  test('should handle ZodNull', () => {
    const schema = z.null()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('null')
  })

  test('should handle ZodAny', () => {
    const schema = z.any()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('any')
  })

  test('should handle ZodUnknown', () => {
    const schema = z.unknown()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('unknown')
  })

  test('should handle ZodNever', () => {
    const schema = z.never()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('never')
  })

  test('should handle ZodVoid', () => {
    const schema = z.void()
    const key = getStableSchemaKey(schema)

    expect(key).toBe('void')
  })

  test('should handle ZodLiteral', () => {
    const stringLiteral = z.literal('active')
    const numberLiteral = z.literal(42)
    const booleanLiteral = z.literal(true)
    const nullLiteral = z.literal(null)

    expect(getStableSchemaKey(stringLiteral)).toBe('literal:active')
    expect(getStableSchemaKey(numberLiteral)).toBe('literal:42')
    expect(getStableSchemaKey(booleanLiteral)).toBe('literal:true')
    expect(getStableSchemaKey(nullLiteral)).toBe('literal:null')
  })

  test('should handle ZodEnum', () => {
    const schema = z.enum(['active', 'inactive', 'pending'])
    const key = getStableSchemaKey(schema)

    expect(key).toBe('enum:[active|inactive|pending]')
  })

  test('should handle ZodEnum with sorted values', () => {
    const schema1 = z.enum(['c', 'a', 'b'])
    const schema2 = z.enum(['a', 'b', 'c'])

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
    expect(key1).toBe('enum:[a|b|c]')
  })

  test('should handle ZodTuple', () => {
    const schema = z.tuple([z.string(), z.number(), z.boolean()])
    const key = getStableSchemaKey(schema)

    expect(key).toBe('tuple:[str,num,bool]')
  })

  test('should handle ZodTuple with complex items', () => {
    const schema = z.tuple([z.object({ id: z.number() }), z.array(z.string())])
    const key = getStableSchemaKey(schema)

    expect(key).toContain('tuple:')
    expect(key).toContain('obj:{id:num}')
    expect(key).toContain('arr:str')
  })

  test('should handle ZodRecord', () => {
    const schema = z.record(z.string())
    const key = getStableSchemaKey(schema)

    expect(key).toBe('record:str')
  })

  test('should handle ZodRecord with complex value type', () => {
    const schema = z.record(z.object({ count: z.number() }))
    const key = getStableSchemaKey(schema)

    expect(key).toBe('record:obj:{count:num}')
  })

  test('should handle ZodMap', () => {
    const schema = z.map(z.string(), z.number())
    const key = getStableSchemaKey(schema)

    expect(key).toBe('map:str->num')
  })

  test('should handle ZodMap with complex types', () => {
    const schema = z.map(z.string(), z.object({ value: z.boolean() }))
    const key = getStableSchemaKey(schema)

    expect(key).toBe('map:str->obj:{value:bool}')
  })

  test('should handle ZodSet', () => {
    const schema = z.set(z.string())
    const key = getStableSchemaKey(schema)

    expect(key).toBe('set:str')
  })

  test('should handle ZodSet with complex value type', () => {
    const schema = z.set(z.object({ id: z.number() }))
    const key = getStableSchemaKey(schema)

    expect(key).toBe('set:obj:{id:num}')
  })

  test('should handle ZodIntersection', () => {
    const schema = z.intersection(z.object({ id: z.number() }), z.object({ name: z.string() }))
    const key = getStableSchemaKey(schema)

    expect(key).toContain('intersect:')
    expect(key).toContain('obj:{id:num}')
    expect(key).toContain('obj:{name:str}')
  })

  test('should handle ZodDiscriminatedUnion with Map options', () => {
    // 創建一個模擬的 ZodDiscriminatedUnion schema 結構
    // 源代碼期望 options 是一個 Map<string, ZodSchema>
    const mockOptionA = z.object({ type: z.literal('a'), value: z.string() })
    const mockOptionB = z.object({ type: z.literal('b'), count: z.number() })

    const mockDiscriminatedUnion = {
      _def: {
        typeName: 'ZodDiscriminatedUnion',
        discriminator: 'type',
        options: new Map([
          ['a', mockOptionA],
          ['b', mockOptionB],
        ]),
      },
    }

    const key = getStableSchemaKey(mockDiscriminatedUnion)

    expect(key).toContain('discriminated:type:')
    expect(key).toContain('obj:')
  })

  test('should handle array input (non-Zod)', () => {
    const schema = [z.string()]
    const key = getStableSchemaKey(schema)

    expect(key).toBe('array:str')
  })

  test('should handle array with single element input', () => {
    const schema = [z.number()]
    const key = getStableSchemaKey(schema)

    expect(key).toBe('array:num')
  })

  test('should handle deeply nested schemas', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          settings: z.object({
            notifications: z.object({
              email: z.boolean(),
              push: z.boolean(),
            }),
          }),
        }),
      }),
    })

    const key1 = getStableSchemaKey(schema)
    const key2 = getStableSchemaKey(schema)

    expect(key1).toBe(key2)
    expect(key1).toContain('obj:')
  })

  test('should handle unknown typeName with fallback', () => {
    // 模擬未知的 Zod 類型
    const mockSchema = {
      _def: {
        typeName: 'ZodCustomUnknownType',
      },
    }
    const key = getStableSchemaKey(mockSchema)

    expect(key).toMatch(/^hash:/)
  })
})
