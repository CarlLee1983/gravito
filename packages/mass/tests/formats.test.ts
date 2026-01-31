import { beforeEach, describe, expect, test } from 'bun:test'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import {
  getFormatValidator,
  isFormatRegistered,
  REGISTERED_FORMATS,
  registerAllFormats,
  registerFormat,
  unregisterFormat,
} from '../src/formats'

describe('formats.ts', () => {
  beforeEach(() => {
    // 每個測試前都重新註冊所有格式，確保測試隔離
    registerAllFormats()
  })

  describe('registerAllFormats', () => {
    test('should register all predefined formats', () => {
      registerAllFormats()

      for (const format of REGISTERED_FORMATS) {
        expect(isFormatRegistered(format)).toBe(true)
      }
    })
  })

  describe('email format', () => {
    test('should validate correct email addresses', () => {
      const schema = Type.String({ format: 'email' })

      expect(Value.Check(schema, 'test@example.com')).toBe(true)
      expect(Value.Check(schema, 'user.name@example.co.uk')).toBe(true)
      expect(Value.Check(schema, 'test+tag@example.com')).toBe(true)
    })

    test('should reject invalid email addresses', () => {
      const schema = Type.String({ format: 'email' })

      expect(Value.Check(schema, 'invalid')).toBe(false)
      expect(Value.Check(schema, '@example.com')).toBe(false)
      expect(Value.Check(schema, 'test@')).toBe(false)
      expect(Value.Check(schema, 'test @example.com')).toBe(false)
    })
  })

  describe('uuid format', () => {
    test('should validate correct UUID strings', () => {
      const schema = Type.String({ format: 'uuid' })

      expect(Value.Check(schema, '123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(Value.Check(schema, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true)
      expect(Value.Check(schema, '550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    test('should reject invalid UUID strings', () => {
      const schema = Type.String({ format: 'uuid' })

      expect(Value.Check(schema, 'not-a-uuid')).toBe(false)
      expect(Value.Check(schema, '123e4567-e89b-12d3-a456')).toBe(false)
      expect(Value.Check(schema, '123e4567-e89b-12d3-a456-42661417400g')).toBe(false)
    })
  })

  describe('uri format', () => {
    test('should validate correct URLs', () => {
      const schema = Type.String({ format: 'uri' })

      expect(Value.Check(schema, 'https://example.com')).toBe(true)
      expect(Value.Check(schema, 'http://example.com/path')).toBe(true)
      expect(Value.Check(schema, 'https://example.com/path?query=value')).toBe(true)
    })

    test('should reject invalid URLs', () => {
      const schema = Type.String({ format: 'uri' })

      expect(Value.Check(schema, 'not a url')).toBe(false)
      expect(Value.Check(schema, 'ftp://invalid')).toBe(false)
    })
  })

  describe('date-time format', () => {
    test('should validate ISO 8601 date-time strings', () => {
      const schema = Type.String({ format: 'date-time' })

      expect(Value.Check(schema, '2024-01-15T10:30:00Z')).toBe(true)
      expect(Value.Check(schema, '2024-01-15T10:30:00.123Z')).toBe(true)
      expect(Value.Check(schema, '2024-01-15T10:30:00+08:00')).toBe(true)
      expect(Value.Check(schema, '2024-01-15 10:30:00')).toBe(true)
    })

    test('should reject invalid date-time strings', () => {
      const schema = Type.String({ format: 'date-time' })

      expect(Value.Check(schema, '2024-01-15')).toBe(false)
      expect(Value.Check(schema, '10:30:00')).toBe(false)
      expect(Value.Check(schema, 'not a datetime')).toBe(false)
    })
  })

  describe('date format', () => {
    test('should validate ISO 8601 date strings', () => {
      const schema = Type.String({ format: 'date' })

      expect(Value.Check(schema, '2024-01-15')).toBe(true)
      expect(Value.Check(schema, '2024-12-31')).toBe(true)
    })

    test('should reject invalid date strings', () => {
      const schema = Type.String({ format: 'date' })

      expect(Value.Check(schema, '2024-13-01')).toBe(false)
      expect(Value.Check(schema, '2024/01/15')).toBe(false)
      expect(Value.Check(schema, '15-01-2024')).toBe(false)
    })
  })

  describe('time format', () => {
    test('should validate ISO 8601 time strings', () => {
      const schema = Type.String({ format: 'time' })

      expect(Value.Check(schema, '10:30:00')).toBe(true)
      expect(Value.Check(schema, '23:59:59')).toBe(true)
      expect(Value.Check(schema, '00:00:00.123')).toBe(true)
    })

    test('should reject invalid time strings', () => {
      const schema = Type.String({ format: 'time' })

      expect(Value.Check(schema, '25:00:00')).toBe(false)
      expect(Value.Check(schema, '10:30')).toBe(false)
      expect(Value.Check(schema, 'not a time')).toBe(false)
    })
  })

  describe('ipv4 format', () => {
    test('should validate correct IPv4 addresses', () => {
      const schema = Type.String({ format: 'ipv4' })

      expect(Value.Check(schema, '192.168.1.1')).toBe(true)
      expect(Value.Check(schema, '10.0.0.1')).toBe(true)
      expect(Value.Check(schema, '255.255.255.255')).toBe(true)
    })

    test('should reject invalid IPv4 addresses', () => {
      const schema = Type.String({ format: 'ipv4' })

      expect(Value.Check(schema, '256.1.1.1')).toBe(false)
      expect(Value.Check(schema, '192.168.1')).toBe(false)
      expect(Value.Check(schema, 'not an ip')).toBe(false)
    })
  })

  describe('ipv6 format', () => {
    test('should validate correct IPv6 addresses', () => {
      const schema = Type.String({ format: 'ipv6' })

      expect(Value.Check(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
      expect(Value.Check(schema, '2001:db8:85a3::8a2e:370:7334')).toBe(true)
      expect(Value.Check(schema, '::1')).toBe(true)
    })

    test('should reject invalid IPv6 addresses', () => {
      const schema = Type.String({ format: 'ipv6' })

      expect(Value.Check(schema, '192.168.1.1')).toBe(false)
      expect(Value.Check(schema, 'not an ipv6')).toBe(false)
    })
  })

  describe('registerFormat', () => {
    test('should register custom format', () => {
      const customValidator = (value: string) => value.startsWith('CUSTOM-')

      registerFormat('custom-format', customValidator)

      expect(isFormatRegistered('custom-format')).toBe(true)

      const schema = Type.String({ format: 'custom-format' })
      expect(Value.Check(schema, 'CUSTOM-123')).toBe(true)
      expect(Value.Check(schema, 'invalid')).toBe(false)
    })

    test('should allow overriding existing format', () => {
      const newValidator = (value: string) => value === 'exact-match'

      registerFormat('email', newValidator)

      const schema = Type.String({ format: 'email' })
      expect(Value.Check(schema, 'exact-match')).toBe(true)
      expect(Value.Check(schema, 'test@example.com')).toBe(false)

      // 恢復原始驗證器
      registerAllFormats()
    })
  })

  describe('isFormatRegistered', () => {
    test('should return true for registered formats', () => {
      expect(isFormatRegistered('email')).toBe(true)
      expect(isFormatRegistered('uuid')).toBe(true)
    })

    test('should return false for unregistered formats', () => {
      expect(isFormatRegistered('nonexistent-format')).toBe(false)
    })
  })

  describe('getFormatValidator', () => {
    test('should return validator for registered format', () => {
      const validator = getFormatValidator('email')

      expect(validator).toBeDefined()
      expect(validator?.('test@example.com')).toBe(true)
      expect(validator?.('invalid')).toBe(false)
    })

    test('should return undefined for unregistered format', () => {
      const validator = getFormatValidator('nonexistent')

      expect(validator).toBeUndefined()
    })

    test('should work with custom formats', () => {
      registerFormat('custom', (value) => value === 'valid')

      const validator = getFormatValidator('custom')
      expect(validator).toBeDefined()
      expect(validator?.('valid')).toBe(true)
      expect(validator?.('invalid')).toBe(false)
    })
  })

  describe('unregisterFormat', () => {
    test('should remove registered format', () => {
      registerFormat('temp-format', (value) => true)
      expect(isFormatRegistered('temp-format')).toBe(true)

      unregisterFormat('temp-format')
      expect(isFormatRegistered('temp-format')).toBe(false)
    })

    test('should not throw when unregistering nonexistent format', () => {
      expect(() => unregisterFormat('nonexistent')).not.toThrow()
    })
  })

  describe('REGISTERED_FORMATS constant', () => {
    test('should contain all expected formats', () => {
      const expectedFormats = [
        'email',
        'uri',
        'uri-reference',
        'uuid',
        'date-time',
        'date',
        'time',
        'ipv4',
        'ipv6',
      ]

      expect(REGISTERED_FORMATS).toEqual(expectedFormats)
    })
  })

  describe('Integration tests', () => {
    test('should work with complex schemas', () => {
      const schema = Type.Object({
        email: Type.String({ format: 'email' }),
        website: Type.String({ format: 'uri' }),
        id: Type.String({ format: 'uuid' }),
        createdAt: Type.String({ format: 'date-time' }),
      })

      const validData = {
        email: 'test@example.com',
        website: 'https://example.com',
        id: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-15T10:30:00Z',
      }

      expect(Value.Check(schema, validData)).toBe(true)

      const invalidData = {
        email: 'invalid-email',
        website: 'not a url',
        id: 'not-a-uuid',
        createdAt: 'invalid-date',
      }

      expect(Value.Check(schema, invalidData)).toBe(false)
    })
  })
})
