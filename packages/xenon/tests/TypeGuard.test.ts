import { describe, expect, it } from 'bun:test'
import { XenonTypeError } from '../src/errors'
import { validateSymbolDef, validateSymbols, validateType } from '../src/safety/TypeGuard'

describe('TypeGuard', () => {
  describe('validateType', () => {
    it('should accept valid integer types', () => {
      expect(validateType('i8')).toBe(true)
      expect(validateType('i16')).toBe(true)
      expect(validateType('i32')).toBe(true)
      expect(validateType('i64')).toBe(true)
    })

    it('should accept valid unsigned types', () => {
      expect(validateType('u8')).toBe(true)
      expect(validateType('u16')).toBe(true)
      expect(validateType('u32')).toBe(true)
      expect(validateType('u64')).toBe(true)
    })

    it('should accept valid float types', () => {
      expect(validateType('f32')).toBe(true)
      expect(validateType('f64')).toBe(true)
    })

    it('should accept special types', () => {
      expect(validateType('ptr')).toBe(true)
      expect(validateType('void')).toBe(true)
      expect(validateType('cstring')).toBe(true)
      expect(validateType('bool')).toBe(true)
    })

    it('should reject invalid types', () => {
      expect(validateType('invalid')).toBe(false)
      expect(validateType('callback')).toBe(false)
      expect(validateType('string')).toBe(false)
    })
  })

  describe('validateSymbolDef', () => {
    it('should validate correct symbol definitions', () => {
      const result = validateSymbolDef('add', {
        args: ['i32', 'i32'],
        returns: 'i32',
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept void return type', () => {
      const result = validateSymbolDef('free', {
        args: ['ptr'],
        returns: 'void',
      })
      expect(result.valid).toBe(true)
    })

    it('should accept empty args', () => {
      const result = validateSymbolDef('version', {
        args: [],
        returns: 'cstring',
      })
      expect(result.valid).toBe(true)
    })

    it('should reject callback types', () => {
      const result = validateSymbolDef('register', {
        args: ['callback'],
        returns: 'void',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('callback')
    })

    it('should reject invalid return type', () => {
      const result = validateSymbolDef('bad', {
        args: ['i32'],
        returns: 'invalid_type' as any,
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('unknown return type')
    })

    it('should reject invalid arg types', () => {
      const result = validateSymbolDef('bad', {
        args: ['i32', 'invalid_type' as any],
        returns: 'i32',
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('unknown arg type')
    })

    it('should reject non-array args', () => {
      const result = validateSymbolDef('bad', {
        args: 'i32' as any,
        returns: 'i32',
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('args must be an array')
    })

    it('should report multiple errors', () => {
      const result = validateSymbolDef('bad', {
        args: ['invalid1' as any, 'invalid2' as any],
        returns: 'invalid' as any,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('validateSymbols', () => {
    it('should validate all correct symbols', () => {
      const symbols = {
        add: { args: ['i32', 'i32'], returns: 'i32' },
        subtract: { args: ['i32', 'i32'], returns: 'i32' },
      }
      expect(() => validateSymbols(symbols)).not.toThrow()
    })

    it('should throw on invalid symbols', () => {
      const symbols = {
        good: { args: ['i32'], returns: 'i32' },
        bad: { args: ['callback'], returns: 'void' },
      }
      expect(() => validateSymbols(symbols)).toThrow(XenonTypeError)
    })

    it('should throw with detailed error message', () => {
      const symbols = {
        bad: { args: ['invalid' as any], returns: 'void' },
      }
      try {
        validateSymbols(symbols)
        expect.unreachable()
      } catch (e) {
        expect(e).toBeInstanceOf(XenonTypeError)
        expect(String(e)).toContain('Symbol validation failed')
      }
    })
  })
})
