import { describe, expect, it } from 'bun:test'
import { Kind } from 'graphql'
import { JSONScalar } from '../../src/scalars/json'

describe('JSONScalar', () => {
  describe('serialize', () => {
    it('should serialize object to itself', () => {
      const value = { foo: 'bar', nested: { num: 123 } }
      expect(JSONScalar.serialize(value)).toEqual(value)
    })

    it('should serialize array to itself', () => {
      const value = [1, 2, { a: 'b' }]
      expect(JSONScalar.serialize(value)).toEqual(value)
    })

    it('should serialize string to itself', () => {
      expect(JSONScalar.serialize('hello')).toBe('hello')
    })

    it('should serialize number to itself', () => {
      expect(JSONScalar.serialize(42)).toBe(42)
    })

    it('should serialize boolean to itself', () => {
      expect(JSONScalar.serialize(true)).toBe(true)
    })

    it('should serialize null to null', () => {
      expect(JSONScalar.serialize(null)).toBeNull()
    })

    it('should parse JSON string and return object', () => {
      const jsonString = '{"foo":"bar"}'
      expect(JSONScalar.serialize(jsonString)).toEqual({ foo: 'bar' })
    })

    it('should return string as-is if not valid JSON', () => {
      const invalidJson = 'not json'
      expect(JSONScalar.serialize(invalidJson)).toBe('not json')
    })
  })

  describe('parseValue', () => {
    it('should parse object directly', () => {
      const value = { foo: 'bar' }
      expect(JSONScalar.parseValue(value)).toEqual(value)
    })

    it('should parse JSON string to object', () => {
      const jsonString = '{"key":"value"}'
      expect(JSONScalar.parseValue(jsonString)).toEqual({ key: 'value' })
    })

    it('should return string if not valid JSON', () => {
      expect(JSONScalar.parseValue('plain text')).toBe('plain text')
    })

    it('should parse array', () => {
      const arr = [1, 2, 3]
      expect(JSONScalar.parseValue(arr)).toEqual([1, 2, 3])
    })

    it('should handle null', () => {
      expect(JSONScalar.parseValue(null)).toBeNull()
    })

    it('should handle undefined', () => {
      expect(JSONScalar.parseValue(undefined)).toBeUndefined()
    })
  })

  describe('parseLiteral', () => {
    it('should parse StringValue as JSON', () => {
      const ast = {
        kind: Kind.STRING,
        value: '{"parsed":"literal"}',
      }
      expect(JSONScalar.parseLiteral(ast, {})).toEqual({ parsed: 'literal' })
    })

    it('should return string if StringValue is not valid JSON', () => {
      const ast = {
        kind: Kind.STRING,
        value: 'just a string',
      }
      expect(JSONScalar.parseLiteral(ast, {})).toBe('just a string')
    })

    it('should parse IntValue', () => {
      const ast = {
        kind: Kind.INT,
        value: '42',
      }
      expect(JSONScalar.parseLiteral(ast, {})).toBe(42)
    })

    it('should parse FloatValue', () => {
      const ast = {
        kind: Kind.FLOAT,
        value: '3.14',
      }
      expect(JSONScalar.parseLiteral(ast, {})).toBe(3.14)
    })

    it('should parse BooleanValue true', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: true,
      }
      expect(JSONScalar.parseLiteral(ast, {})).toBe(true)
    })

    it('should parse BooleanValue false', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: false,
      }
      expect(JSONScalar.parseLiteral(ast, {})).toBe(false)
    })

    it('should parse NullValue', () => {
      const ast = {
        kind: Kind.NULL,
      }
      expect(JSONScalar.parseLiteral(ast, {})).toBeNull()
    })

    it('should parse ObjectValue', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            kind: Kind.OBJECT_FIELD,
            name: { kind: Kind.NAME, value: 'key' },
            value: { kind: Kind.STRING, value: 'value' },
          },
        ],
      }
      expect(JSONScalar.parseLiteral(ast, {})).toEqual({ key: 'value' })
    })

    it('should parse ListValue', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          { kind: Kind.INT, value: '1' },
          { kind: Kind.INT, value: '2' },
          { kind: Kind.STRING, value: 'three' },
        ],
      }
      expect(JSONScalar.parseLiteral(ast, {})).toEqual([1, 2, 'three'])
    })

    it('should parse nested ObjectValue', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            kind: Kind.OBJECT_FIELD,
            name: { kind: Kind.NAME, value: 'outer' },
            value: {
              kind: Kind.OBJECT,
              fields: [
                {
                  kind: Kind.OBJECT_FIELD,
                  name: { kind: Kind.NAME, value: 'inner' },
                  value: { kind: Kind.INT, value: '99' },
                },
              ],
            },
          },
        ],
      }
      expect(JSONScalar.parseLiteral(ast, {})).toEqual({ outer: { inner: 99 } })
    })

    it('should throw for unsupported AST kind', () => {
      const ast = {
        kind: Kind.ENUM,
        value: 'SOME_ENUM',
      }
      expect(() => JSONScalar.parseLiteral(ast, {})).toThrow()
    })
  })

  describe('type properties', () => {
    it('should have correct name', () => {
      expect(JSONScalar.name).toBe('JSON')
    })

    it('should have description', () => {
      expect(JSONScalar.description).toBeDefined()
      expect(typeof JSONScalar.description).toBe('string')
    })
  })
})
