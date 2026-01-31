import { describe, expect, test } from 'bun:test'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import {
  createErrorFormatter,
  ERROR_MESSAGES_EN,
  ERROR_MESSAGES_ZH_TW,
  enhanceError,
  formatErrors,
  MassValidationError,
} from '../src/errors'

describe('errors.ts', () => {
  describe('MassValidationError', () => {
    test('should create error with source and errors', () => {
      const errors = [
        { path: '/email', message: 'Invalid email format' },
        { path: '/name', message: 'Required field' },
      ]
      const error = new MassValidationError('json', errors)

      expect(error.name).toBe('MassValidationError')
      expect(error.message).toBe('Validation failed for json')
      expect(error.source).toBe('json')
      expect(error.errors).toEqual(errors)
    })

    test('should serialize to JSON correctly', () => {
      const errors = [{ path: '/email', message: 'Invalid email' }]
      const error = new MassValidationError('query', errors)
      const json = error.toJSON()

      expect(json).toEqual({
        error: 'ValidationError',
        source: 'query',
        details: errors,
      })
    })

    test('should work with different sources', () => {
      const sources: Array<'json' | 'query' | 'param' | 'form'> = ['json', 'query', 'param', 'form']

      for (const source of sources) {
        const error = new MassValidationError(source, [])
        expect(error.source).toBe(source)
        expect(error.message).toContain(source)
      }
    })
  })

  describe('formatErrors', () => {
    test('should group errors by field', () => {
      const errors = [
        { path: '/user/name', message: 'Too short' },
        { path: '/user/name', message: 'Invalid format' },
        { path: '/user/email', message: 'Required' },
      ]

      const result = formatErrors(errors)

      expect(result.fields['user.name']).toEqual(['Too short', 'Invalid format'])
      expect(result.fields['user.email']).toEqual(['Required'])
    })

    test('should handle root path', () => {
      const errors = [{ path: '/name', message: 'Required' }]
      const result = formatErrors(errors)

      expect(result.fields.name).toEqual(['Required'])
    })

    test('should handle nested paths', () => {
      const errors = [{ path: '/a/b/c/d', message: 'Error' }]
      const result = formatErrors(errors)

      expect(result.fields['a.b.c.d']).toEqual(['Error'])
    })

    test('should return empty object for empty errors', () => {
      const result = formatErrors([])
      expect(result.fields).toEqual({})
    })
  })

  describe('enhanceError', () => {
    test('should enhance required field error (zh-TW)', () => {
      const schema = Type.Object({
        name: Type.String(),
      })
      const data = {}

      const errors = [...Value.Errors(schema, data)]
      expect(errors.length).toBeGreaterThan(0)

      const enhanced = enhanceError(errors[0]!, 'zh-TW')
      expect(enhanced.message).toBe(ERROR_MESSAGES_ZH_TW.REQUIRED)
      expect(enhanced.path).toBeDefined()
    })

    test('should enhance required field error (en)', () => {
      const schema = Type.Object({
        name: Type.String(),
      })
      const data = {}

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!, 'en')

      expect(enhanced.message).toBe(ERROR_MESSAGES_EN.REQUIRED)
    })

    test('should enhance minLength error (zh-TW)', () => {
      const schema = Type.String({ minLength: 5 })
      const data = 'abc'

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!, 'zh-TW')

      expect(enhanced.message).toContain('長度過短')
      expect(enhanced.message).toContain('5')
    })

    test('should enhance minLength error (en)', () => {
      const schema = Type.String({ minLength: 5 })
      const data = 'abc'

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!, 'en')

      expect(enhanced.message).toContain('Too short')
      expect(enhanced.message).toContain('5')
    })

    test('should enhance maxLength error (zh-TW)', () => {
      const schema = Type.String({ maxLength: 3 })
      const data = 'abcdef'

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!, 'zh-TW')

      expect(enhanced.message).toContain('長度過長')
      expect(enhanced.message).toContain('3')
    })

    test('should enhance minimum error (zh-TW)', () => {
      const schema = Type.Number({ minimum: 10 })
      const data = 5

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!, 'zh-TW')

      expect(enhanced.message).toContain('數值過小')
      expect(enhanced.message).toContain('10')
    })

    test('should enhance maximum error (zh-TW)', () => {
      const schema = Type.Number({ maximum: 100 })
      const data = 200

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!, 'zh-TW')

      expect(enhanced.message).toContain('數值過大')
      expect(enhanced.message).toContain('100')
    })

    test('should include expected and received types', () => {
      const schema = Type.Number()
      const data = 'not a number'

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!)

      expect(enhanced.expected).toBeDefined()
      expect(enhanced.received).toBe('string')
    })

    test('should default to zh-TW locale', () => {
      const schema = Type.Object({
        name: Type.String(),
      })
      const data = {}

      const errors = [...Value.Errors(schema, data)]
      const enhanced = enhanceError(errors[0]!)

      expect(enhanced.message).toBe(ERROR_MESSAGES_ZH_TW.REQUIRED)
    })

    test('should handle pattern errors', () => {
      const schema = Type.String({ pattern: '^[A-Z]+$' })
      const data = 'abc123'

      const errors = [...Value.Errors(schema, data)]
      const enhancedZh = enhanceError(errors[0]!, 'zh-TW')
      const enhancedEn = enhanceError(errors[0]!, 'en')

      expect(enhancedZh.message).toBe(ERROR_MESSAGES_ZH_TW.INVALID_PATTERN)
      expect(enhancedEn.message).toBe(ERROR_MESSAGES_EN.INVALID_PATTERN)
    })
  })

  describe('createErrorFormatter', () => {
    test('should create custom formatter', () => {
      const formatter = createErrorFormatter((error) => ({
        path: error.path,
        message: `Custom: ${error.message}`,
      }))

      const schema = Type.Object({ name: Type.String() })
      const data = {}
      const errors = [...Value.Errors(schema, data)]

      const formatted = formatter(errors[0]!)

      expect(formatted.path).toBeDefined()
      expect(formatted.message).toContain('Custom:')
    })

    test('should preserve expected and received fields', () => {
      const formatter = createErrorFormatter((error) => ({
        path: error.path,
        message: 'Custom message',
        expected: 'custom-expected',
        received: 'custom-received',
      }))

      const schema = Type.String()
      const data = 123
      const errors = [...Value.Errors(schema, data)]

      const formatted = formatter(errors[0]!)

      expect(formatted.expected).toBe('custom-expected')
      expect(formatted.received).toBe('custom-received')
    })

    test('should allow additional fields in formatter', () => {
      const formatter = createErrorFormatter((error) => ({
        path: error.path,
        message: error.message,
        customField: 'custom value',
        anotherField: 123,
      }))

      const schema = Type.String()
      const data = 123
      const errors = [...Value.Errors(schema, data)]

      const formatted = formatter(errors[0]!)

      expect(formatted).toHaveProperty('path')
      expect(formatted).toHaveProperty('message')
    })

    test('should work with multiple errors', () => {
      const formatter = createErrorFormatter((error) => ({
        path: error.path,
        message: `Error at ${error.path}`,
      }))

      const schema = Type.Object({
        name: Type.String({ minLength: 5 }),
        email: Type.String(),
      })
      const data = { name: 'ab' }

      const errors = [...Value.Errors(schema, data)]
      const formatted = errors.map(formatter)

      expect(formatted.length).toBeGreaterThan(0)
      for (const f of formatted) {
        expect(f.message).toContain('Error at')
      }
    })
  })

  describe('ERROR_MESSAGES constants', () => {
    test('should have all required zh-TW messages', () => {
      expect(ERROR_MESSAGES_ZH_TW.REQUIRED).toBe('此欄位為必填')
      expect(ERROR_MESSAGES_ZH_TW.INVALID_EMAIL).toBe('電子郵件格式不正確')
      expect(ERROR_MESSAGES_ZH_TW.INVALID_URL).toBe('網址格式不正確')
      expect(ERROR_MESSAGES_ZH_TW.TOO_SHORT).toBe('長度過短')
      expect(ERROR_MESSAGES_ZH_TW.TOO_LONG).toBe('長度過長')
    })

    test('should have all required EN messages', () => {
      expect(ERROR_MESSAGES_EN.REQUIRED).toBe('This field is required')
      expect(ERROR_MESSAGES_EN.INVALID_EMAIL).toBe('Invalid email format')
      expect(ERROR_MESSAGES_EN.INVALID_URL).toBe('Invalid URL format')
      expect(ERROR_MESSAGES_EN.TOO_SHORT).toBe('Too short')
      expect(ERROR_MESSAGES_EN.TOO_LONG).toBe('Too long')
    })

    test('should have matching keys in both locales', () => {
      const zhKeys = Object.keys(ERROR_MESSAGES_ZH_TW).sort()
      const enKeys = Object.keys(ERROR_MESSAGES_EN).sort()

      expect(zhKeys).toEqual(enKeys)
    })
  })
})
