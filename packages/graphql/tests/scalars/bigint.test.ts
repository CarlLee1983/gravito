import { describe, expect, it } from 'bun:test'
import { Kind } from 'graphql'
import { BigIntScalar } from '../../src/scalars/bigint'

describe('BigIntScalar', () => {
  describe('serialize', () => {
    it('should serialize bigint to string', () => {
      const value = BigInt('9007199254740993') // 超過 Number.MAX_SAFE_INTEGER
      expect(BigIntScalar.serialize(value)).toBe('9007199254740993')
    })

    it('should serialize number to string', () => {
      expect(BigIntScalar.serialize(12345)).toBe('12345')
    })

    it('should serialize string to string', () => {
      expect(BigIntScalar.serialize('9007199254740993')).toBe('9007199254740993')
    })

    it('should serialize zero', () => {
      expect(BigIntScalar.serialize(0)).toBe('0')
      expect(BigIntScalar.serialize(BigInt(0))).toBe('0')
    })

    it('should serialize negative bigint', () => {
      const value = BigInt('-9007199254740993')
      expect(BigIntScalar.serialize(value)).toBe('-9007199254740993')
    })

    it('should throw for invalid string', () => {
      expect(() => BigIntScalar.serialize('not a number')).toThrow()
    })

    it('should throw for null', () => {
      expect(() => BigIntScalar.serialize(null)).toThrow()
    })

    it('should throw for undefined', () => {
      expect(() => BigIntScalar.serialize(undefined)).toThrow()
    })

    it('should throw for float number', () => {
      expect(() => BigIntScalar.serialize(3.14)).toThrow()
    })

    it('should throw for object', () => {
      expect(() => BigIntScalar.serialize({ value: 123 })).toThrow()
    })
  })

  describe('parseValue', () => {
    it('should parse string to bigint', () => {
      const result = BigIntScalar.parseValue('9007199254740993')
      expect(result).toBe(BigInt('9007199254740993'))
    })

    it('should parse number to bigint', () => {
      const result = BigIntScalar.parseValue(12345)
      expect(result).toBe(BigInt(12345))
    })

    it('should parse bigint directly', () => {
      const value = BigInt('123456789012345678901234567890')
      const result = BigIntScalar.parseValue(value)
      expect(result).toBe(value)
    })

    it('should parse zero', () => {
      expect(BigIntScalar.parseValue(0)).toBe(BigInt(0))
      expect(BigIntScalar.parseValue('0')).toBe(BigInt(0))
    })

    it('should parse negative number string', () => {
      const result = BigIntScalar.parseValue('-9007199254740993')
      expect(result).toBe(BigInt('-9007199254740993'))
    })

    it('should throw for invalid string', () => {
      expect(() => BigIntScalar.parseValue('invalid')).toThrow()
    })

    it('should throw for null', () => {
      expect(() => BigIntScalar.parseValue(null)).toThrow()
    })

    it('should throw for float number', () => {
      expect(() => BigIntScalar.parseValue(3.14)).toThrow()
    })

    it('should throw for float string', () => {
      expect(() => BigIntScalar.parseValue('3.14')).toThrow()
    })
  })

  describe('parseLiteral', () => {
    it('should parse StringValue to bigint', () => {
      const ast = {
        kind: Kind.STRING,
        value: '9007199254740993',
      }
      const result = BigIntScalar.parseLiteral(ast, {})
      expect(result).toBe(BigInt('9007199254740993'))
    })

    it('should parse IntValue to bigint', () => {
      const ast = {
        kind: Kind.INT,
        value: '12345',
      }
      const result = BigIntScalar.parseLiteral(ast, {})
      expect(result).toBe(BigInt(12345))
    })

    it('should parse large IntValue', () => {
      const ast = {
        kind: Kind.INT,
        value: '9007199254740993',
      }
      const result = BigIntScalar.parseLiteral(ast, {})
      expect(result).toBe(BigInt('9007199254740993'))
    })

    it('should throw for invalid StringValue', () => {
      const ast = {
        kind: Kind.STRING,
        value: 'not a number',
      }
      expect(() => BigIntScalar.parseLiteral(ast, {})).toThrow()
    })

    it('should throw for FloatValue', () => {
      const ast = {
        kind: Kind.FLOAT,
        value: '3.14',
      }
      expect(() => BigIntScalar.parseLiteral(ast, {})).toThrow()
    })

    it('should throw for unsupported AST kind', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: true,
      }
      expect(() => BigIntScalar.parseLiteral(ast, {})).toThrow()
    })

    it('should throw for NullValue', () => {
      const ast = {
        kind: Kind.NULL,
      }
      expect(() => BigIntScalar.parseLiteral(ast, {})).toThrow()
    })
  })

  describe('type properties', () => {
    it('should have correct name', () => {
      expect(BigIntScalar.name).toBe('BigInt')
    })

    it('should have description', () => {
      expect(BigIntScalar.description).toBeDefined()
      expect(typeof BigIntScalar.description).toBe('string')
    })
  })

  describe('edge cases', () => {
    it('should handle MAX_SAFE_INTEGER', () => {
      const max = Number.MAX_SAFE_INTEGER
      const result = BigIntScalar.parseValue(max)
      expect(result).toBe(BigInt(max))
    })

    it('should handle values beyond MAX_SAFE_INTEGER', () => {
      const beyondMax = '9007199254740993' // MAX_SAFE_INTEGER + 2
      const result = BigIntScalar.parseValue(beyondMax)
      expect(result).toBe(BigInt('9007199254740993'))
    })

    it('should handle very large numbers', () => {
      const veryLarge = '123456789012345678901234567890'
      const result = BigIntScalar.parseValue(veryLarge)
      expect(result).toBe(BigInt(veryLarge))
    })

    it('should handle MIN_SAFE_INTEGER', () => {
      const min = Number.MIN_SAFE_INTEGER
      const result = BigIntScalar.parseValue(min)
      expect(result).toBe(BigInt(min))
    })

    it('should serialize and parse round-trip correctly', () => {
      const original = BigInt('9007199254740993')
      const serialized = BigIntScalar.serialize(original)
      const parsed = BigIntScalar.parseValue(serialized)
      expect(parsed).toBe(original)
    })

    it('should preserve precision for very large numbers', () => {
      const largeNum = '12345678901234567890123456789012345678901234567890'
      const result = BigIntScalar.parseValue(largeNum)
      const serialized = BigIntScalar.serialize(result)
      expect(serialized).toBe(largeNum)
    })
  })
})
