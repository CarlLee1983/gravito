import { describe, expect, it } from 'bun:test'
import { Arr } from '../src/helpers/Arr'
import { Str } from '../src/helpers/Str'

describe('Str extra coverage', () => {
  describe('lower', () => {
    it('should convert to lowercase', () => {
      expect(Str.lower('HELLO')).toBe('hello')
    })
  })

  describe('upper', () => {
    it('should convert to uppercase', () => {
      expect(Str.upper('hello')).toBe('HELLO')
    })
  })

  describe('startsWith', () => {
    it('should return true when string starts with needle', () => {
      expect(Str.startsWith('hello world', 'hello')).toBe(true)
    })

    it('should return false when string does not start with needle', () => {
      expect(Str.startsWith('hello world', 'world')).toBe(false)
    })

    it('should support array of needles', () => {
      expect(Str.startsWith('hello world', ['world', 'hello'])).toBe(true)
    })

    it('should ignore empty needles', () => {
      expect(Str.startsWith('hello', ['', 'hello'])).toBe(true)
    })

    it('should return false when no needles match', () => {
      expect(Str.startsWith('hello', ['foo', 'bar'])).toBe(false)
    })
  })

  describe('endsWith', () => {
    it('should return true when string ends with needle', () => {
      expect(Str.endsWith('hello world', 'world')).toBe(true)
    })

    it('should support array of needles', () => {
      expect(Str.endsWith('hello world', ['hello', 'world'])).toBe(true)
    })

    it('should return false when no match', () => {
      expect(Str.endsWith('hello', ['foo'])).toBe(false)
    })
  })

  describe('contains', () => {
    it('should return true when string contains needle', () => {
      expect(Str.contains('hello world', 'lo wo')).toBe(true)
    })

    it('should support array of needles', () => {
      expect(Str.contains('hello world', ['foo', 'world'])).toBe(true)
    })

    it('should return false when no match', () => {
      expect(Str.contains('hello', ['foo'])).toBe(false)
    })
  })

  describe('camel', () => {
    it('should convert to camelCase', () => {
      expect(Str.camel('hello_world')).toBe('helloWorld')
    })

    it('should handle empty string', () => {
      expect(Str.camel('')).toBe('')
    })

    it('should handle PascalCase input', () => {
      expect(Str.camel('HelloWorld')).toBe('helloWorld')
    })
  })

  describe('limit', () => {
    it('should return empty string for negative limit', () => {
      expect(Str.limit('hello', -1)).toBe('')
    })

    it('should return full string when within limit', () => {
      expect(Str.limit('hello', 10)).toBe('hello')
    })

    it('should truncate with custom end', () => {
      expect(Str.limit('hello world', 5, '---')).toBe('hello---')
    })
  })

  describe('slug', () => {
    it('should create URL-friendly slug', () => {
      expect(Str.slug('Hello World')).toBe('hello-world')
    })

    it('should handle special characters', () => {
      expect(Str.slug('Hello! @World#')).toBe('hello-world')
    })

    it('should support custom separator', () => {
      expect(Str.slug('Hello World', '_')).toBe('hello_world')
    })
  })

  describe('uuid', () => {
    it('should generate a UUID string', () => {
      const uuid = Str.uuid()
      expect(uuid).toBeDefined()
      expect(typeof uuid).toBe('string')
      expect(uuid.length).toBeGreaterThan(0)
    })
  })

  describe('random', () => {
    it('should generate random string of specified length', () => {
      const random = Str.random(32)
      expect(random.length).toBe(32)
    })

    it('should return empty string for length 0', () => {
      expect(Str.random(0)).toBe('')
    })

    it('should return empty string for negative length', () => {
      expect(Str.random(-5)).toBe('')
    })
  })
})

describe('Arr extra coverage', () => {
  describe('first', () => {
    it('should return first element without callback', () => {
      expect(Arr.first([1, 2, 3])).toBe(1)
    })

    it('should return first matching element with callback', () => {
      expect(Arr.first([1, 2, 3], (v) => v > 1)).toBe(2)
    })

    it('should return undefined when no match', () => {
      expect(Arr.first([1, 2, 3], (v) => v > 10)).toBeUndefined()
    })
  })

  describe('last', () => {
    it('should return last element without callback', () => {
      expect(Arr.last([1, 2, 3])).toBe(3)
    })

    it('should return undefined for empty array', () => {
      expect(Arr.last([])).toBeUndefined()
    })

    it('should return last matching element with callback', () => {
      expect(Arr.last([1, 2, 3, 4], (v) => v < 3)).toBe(2)
    })

    it('should return undefined when no match with callback', () => {
      expect(Arr.last([1, 2, 3], (v) => v > 10)).toBeUndefined()
    })
  })

  describe('where', () => {
    it('should filter elements by callback', () => {
      const result = Arr.where([1, 2, 3, 4, 5], (v) => v % 2 === 0)
      expect(result).toEqual([2, 4])
    })

    it('should return empty array when no match', () => {
      const result = Arr.where([1, 2, 3], (v) => v > 10)
      expect(result).toEqual([])
    })
  })

  describe('pluck', () => {
    it('should pluck values without key path', () => {
      const items = [{ name: 'Alice' }, { name: 'Bob' }]
      const result = Arr.pluck(items, 'name')
      expect(result).toEqual(['Alice', 'Bob'])
    })

    it('should pluck values with key path', () => {
      const items = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]
      const result = Arr.pluck(items, 'name', 'id')
      expect(result).toEqual({ '1': 'Alice', '2': 'Bob' })
    })
  })
})
