import { describe, expect, it } from 'bun:test'
import { GraphQLError, Kind } from 'graphql'
import { DateTimeScalar } from '../../src/scalars/datetime'

describe('DateTimeScalar', () => {
  describe('serialize', () => {
    it('should serialize Date object to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      expect(DateTimeScalar.serialize(date)).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should serialize ISO string as-is', () => {
      const isoString = '2024-01-15T10:30:00.000Z'
      expect(DateTimeScalar.serialize(isoString)).toBe(isoString)
    })

    it('should serialize timestamp number to ISO string', () => {
      const timestamp = 1705314600000 // 2024-01-15T10:30:00.000Z
      const result = DateTimeScalar.serialize(timestamp)
      expect(result).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should throw for invalid date string', () => {
      expect(() => DateTimeScalar.serialize('not a date')).toThrow()
    })

    it('should throw for null', () => {
      expect(() => DateTimeScalar.serialize(null)).toThrow()
    })

    it('should throw for undefined', () => {
      expect(() => DateTimeScalar.serialize(undefined)).toThrow()
    })

    it('should throw for invalid type', () => {
      expect(() => DateTimeScalar.serialize({ foo: 'bar' })).toThrow()
    })
  })

  describe('parseValue', () => {
    it('should parse ISO string to Date', () => {
      const result = DateTimeScalar.parseValue('2024-01-15T10:30:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should parse Date object directly', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      const result = DateTimeScalar.parseValue(date)
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should parse timestamp number to Date', () => {
      const timestamp = 1705314600000
      const result = DateTimeScalar.parseValue(timestamp)
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should throw for invalid date string', () => {
      expect(() => DateTimeScalar.parseValue('invalid')).toThrow()
    })

    it('should throw for null', () => {
      expect(() => DateTimeScalar.parseValue(null)).toThrow()
    })

    it('should parse date-only string', () => {
      const result = DateTimeScalar.parseValue('2024-01-15')
      expect(result).toBeInstanceOf(Date)
      // 日期部分應該正確
      expect(result.getUTCFullYear()).toBe(2024)
      expect(result.getUTCMonth()).toBe(0) // 0-indexed
      expect(result.getUTCDate()).toBe(15)
    })

    it('should handle timezone offset strings', () => {
      const result = DateTimeScalar.parseValue('2024-01-15T10:30:00+08:00')
      expect(result).toBeInstanceOf(Date)
      // 轉換為 UTC 後應為 02:30
      expect(result.getUTCHours()).toBe(2)
    })
  })

  describe('parseLiteral', () => {
    it('should parse StringValue to Date', () => {
      const ast = {
        kind: Kind.STRING,
        value: '2024-01-15T10:30:00.000Z',
      }
      const result = DateTimeScalar.parseLiteral(ast, {})
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should parse IntValue (timestamp) to Date', () => {
      const ast = {
        kind: Kind.INT,
        value: '1705314600000',
      }
      const result = DateTimeScalar.parseLiteral(ast, {})
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should throw for invalid StringValue', () => {
      const ast = {
        kind: Kind.STRING,
        value: 'not a date',
      }
      expect(() => DateTimeScalar.parseLiteral(ast, {})).toThrow()
    })

    it('should throw for unsupported AST kind', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: true,
      }
      expect(() => DateTimeScalar.parseLiteral(ast, {})).toThrow()
    })

    it('should throw for NullValue', () => {
      const ast = {
        kind: Kind.NULL,
      }
      expect(() => DateTimeScalar.parseLiteral(ast, {})).toThrow()
    })
  })

  describe('type properties', () => {
    it('should have correct name', () => {
      expect(DateTimeScalar.name).toBe('DateTime')
    })

    it('should have description', () => {
      expect(DateTimeScalar.description).toBeDefined()
      expect(typeof DateTimeScalar.description).toBe('string')
    })
  })

  describe('edge cases', () => {
    it('should handle leap year date', () => {
      const result = DateTimeScalar.parseValue('2024-02-29T00:00:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCDate()).toBe(29)
      expect(result.getUTCMonth()).toBe(1) // February
    })

    it('should handle minimum date', () => {
      const result = DateTimeScalar.parseValue('1970-01-01T00:00:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(0)
    })

    it('should handle far future date', () => {
      const result = DateTimeScalar.parseValue('2099-12-31T23:59:59.999Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCFullYear()).toBe(2099)
    })

    it('should serialize and parse round-trip correctly', () => {
      const original = new Date('2024-06-15T14:30:45.123Z')
      const serialized = DateTimeScalar.serialize(original)
      const parsed = DateTimeScalar.parseValue(serialized)
      expect(parsed.getTime()).toBe(original.getTime())
    })
  })
})
