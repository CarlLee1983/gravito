import { describe, expect, test } from 'bun:test'
import { Type } from '@sinclair/typebox'
import {
  CoercibleBoolean,
  CoercibleInteger,
  CoercibleNumber,
  coerceBoolean,
  coerceData,
  coerceDate,
  coerceInteger,
  coerceNumber,
} from '../src/coercion'

describe('coercion.ts', () => {
  describe('coerceNumber', () => {
    test('should convert valid number strings', () => {
      expect(coerceNumber('123')).toBe(123)
      expect(coerceNumber('12.34')).toBe(12.34)
      expect(coerceNumber('0')).toBe(0)
      expect(coerceNumber('-5.67')).toBe(-5.67)
    })

    test('should return NaN for invalid strings', () => {
      expect(Number.isNaN(coerceNumber('abc'))).toBe(true)
      expect(Number.isNaN(coerceNumber('12abc'))).toBe(true)
    })

    test('should convert empty string to 0', () => {
      // JavaScript Number('') === 0
      expect(coerceNumber('')).toBe(0)
    })

    test('should handle special number values', () => {
      expect(coerceNumber('Infinity')).toBe(Number.POSITIVE_INFINITY)
      expect(coerceNumber('-Infinity')).toBe(Number.NEGATIVE_INFINITY)
    })
  })

  describe('coerceInteger', () => {
    test('should convert valid integer strings', () => {
      expect(coerceInteger('123')).toBe(123)
      expect(coerceInteger('0')).toBe(0)
      expect(coerceInteger('-456')).toBe(-456)
    })

    test('should truncate decimal values', () => {
      expect(coerceInteger('12.99')).toBe(12)
      expect(coerceInteger('5.1')).toBe(5)
    })

    test('should return NaN for invalid strings', () => {
      expect(Number.isNaN(coerceInteger('abc'))).toBe(true)
      expect(Number.isNaN(coerceInteger(''))).toBe(true)
    })
  })

  describe('coerceBoolean', () => {
    test('should convert truthy strings', () => {
      expect(coerceBoolean('true')).toBe(true)
      expect(coerceBoolean('TRUE')).toBe(true)
      expect(coerceBoolean('1')).toBe(true)
      expect(coerceBoolean('yes')).toBe(true)
      expect(coerceBoolean('YES')).toBe(true)
      expect(coerceBoolean('on')).toBe(true)
      expect(coerceBoolean('ON')).toBe(true)
    })

    test('should convert falsy strings', () => {
      expect(coerceBoolean('false')).toBe(false)
      expect(coerceBoolean('FALSE')).toBe(false)
      expect(coerceBoolean('0')).toBe(false)
      expect(coerceBoolean('no')).toBe(false)
      expect(coerceBoolean('NO')).toBe(false)
      expect(coerceBoolean('')).toBe(false)
      expect(coerceBoolean('anything')).toBe(false)
    })

    test('should handle whitespace', () => {
      expect(coerceBoolean('  true  ')).toBe(true)
      expect(coerceBoolean('  false  ')).toBe(false)
    })
  })

  describe('coerceDate', () => {
    test('should convert valid date strings', () => {
      const date1 = coerceDate('2024-01-15')
      expect(date1 instanceof Date).toBe(true)
      expect(date1.getFullYear()).toBe(2024)

      const date2 = coerceDate('2024-01-15T10:30:00Z')
      expect(date2 instanceof Date).toBe(true)
    })

    test('should return Invalid Date for invalid strings', () => {
      const date = coerceDate('invalid')
      expect(date instanceof Date).toBe(true)
      expect(Number.isNaN(date.getTime())).toBe(true)
    })
  })

  describe('coerceData', () => {
    test('should coerce numbers in object', () => {
      const schema = Type.Object({
        page: Type.Number(),
        limit: Type.Number(),
      })

      const data = { page: '1', limit: '20' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ page: 1, limit: 20 })
    })

    test('should coerce integers in object', () => {
      const schema = Type.Object({
        id: Type.Integer(),
        count: Type.Integer(),
      })

      const data = { id: '123', count: '456' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ id: 123, count: 456 })
    })

    test('should coerce booleans in object', () => {
      const schema = Type.Object({
        active: Type.Boolean(),
        published: Type.Boolean(),
      })

      const data = { active: 'true', published: 'false' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ active: true, published: false })
    })

    test('should handle mixed types', () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
        active: Type.Boolean(),
      })

      const data = { name: 'John', age: '25', active: 'true' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ name: 'John', age: 25, active: true })
    })

    test('should preserve non-string values', () => {
      const schema = Type.Object({
        id: Type.Number(),
        name: Type.String(),
      })

      const data = { id: 123, name: 'test' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ id: 123, name: 'test' })
    })

    test('should handle missing schema properties', () => {
      const schema = Type.Object({
        name: Type.String(),
      })

      const data = { name: 'test', extra: '123' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ name: 'test', extra: '123' })
    })

    test('should return original data if not object', () => {
      const schema = Type.String()

      expect(coerceData('test', schema)).toBe('test')
      expect(coerceData(123, schema)).toBe(123)
      expect(coerceData(null, schema)).toBe(null)
    })

    test('should return original data if schema is not object type', () => {
      const schema = Type.String()
      const data = { test: 'value' }

      expect(coerceData(data, schema)).toBe(data)
    })
  })

  describe('CoercibleNumber', () => {
    test('should create number schema with coercion', () => {
      const schema = CoercibleNumber()
      expect(schema.type).toBe('number')
    })

    test('should preserve constraints', () => {
      const schema = CoercibleNumber({ minimum: 1, maximum: 100 })
      expect(schema.minimum).toBe(1)
      expect(schema.maximum).toBe(100)
    })

    test('should support default value', () => {
      const schema = CoercibleNumber({ default: 10 })
      expect(schema.default).toBe(10)
    })
  })

  describe('CoercibleInteger', () => {
    test('should create integer schema with coercion', () => {
      const schema = CoercibleInteger()
      expect(schema.type).toBe('integer')
    })

    test('should preserve constraints', () => {
      const schema = CoercibleInteger({ minimum: 0, maximum: 1000 })
      expect(schema.minimum).toBe(0)
      expect(schema.maximum).toBe(1000)
    })
  })

  describe('CoercibleBoolean', () => {
    test('should create boolean schema with coercion', () => {
      const schema = CoercibleBoolean()
      expect(schema.type).toBe('boolean')
    })

    test('should support default value', () => {
      const schema = CoercibleBoolean({ default: false })
      expect(schema.default).toBe(false)
    })
  })

  describe('Integration tests', () => {
    test('should work with complex nested schema', () => {
      const schema = Type.Object({
        query: Type.String(),
        pagination: Type.Object({
          page: Type.Number(),
          limit: Type.Number(),
        }),
        filters: Type.Object({
          active: Type.Boolean(),
          minPrice: Type.Number(),
        }),
      })

      const data = {
        query: 'search',
        pagination: {
          page: '1',
          limit: '20',
        },
        filters: {
          active: 'true',
          minPrice: '100',
        },
      }

      // 注意：coerceData 只處理第一層，不會遞迴處理巢狀物件
      // 這是設計上的限制，實際使用時應該在 middleware 層面處理
      const result = coerceData(data, schema)

      // 第一層的型別會被保留
      expect(result).toHaveProperty('query', 'search')
      expect(result).toHaveProperty('pagination')
      expect(result).toHaveProperty('filters')
    })

    test('should handle empty object', () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
      })

      const result = coerceData({}, schema)
      expect(result).toEqual({})
    })

    test('should handle optional fields', () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Optional(Type.Number()),
      })

      const data = { name: 'John' }
      const result = coerceData(data, schema)

      expect(result).toEqual({ name: 'John' })
    })
  })

  describe('Edge cases', () => {
    test('should handle NaN conversion gracefully', () => {
      const schema = Type.Object({
        value: Type.Number(),
      })

      const data = { value: 'not-a-number' }
      const result = coerceData(data, schema)

      expect(Number.isNaN((result as { value: number }).value)).toBe(true)
    })

    test('should handle empty string for numbers', () => {
      const schema = Type.Object({
        value: Type.Number(),
      })

      const data = { value: '' }
      const result = coerceData(data, schema)

      // JavaScript Number('') === 0
      expect((result as { value: number }).value).toBe(0)
    })

    test('should handle whitespace in boolean', () => {
      expect(coerceBoolean('  ')).toBe(false)
      expect(coerceBoolean('\t\n')).toBe(false)
    })
  })
})
