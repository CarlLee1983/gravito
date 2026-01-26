import { describe, expect, it } from 'bun:test'
import { BaseProvider } from '../src/providers/base/BaseProvider'
import { getHeader, getHeaders, hasHeader } from '../src/providers/base/HeaderUtils'
import type { WebhookVerificationResult } from '../src/types'

describe('HeaderUtils', () => {
  describe('getHeader', () => {
    it('should return header value with exact name match', () => {
      const headers = { 'X-Test': 'value' }
      expect(getHeader(headers, 'X-Test')).toBe('value')
    })

    it('should return header value with lowercase match', () => {
      const headers = { 'x-test': 'value' }
      expect(getHeader(headers, 'X-Test')).toBe('value')
    })

    it('should return first value from array', () => {
      const headers = { 'X-Test': ['v1', 'v2'] }
      expect(getHeader(headers, 'X-Test')).toBe('v1')
    })

    it('should return undefined for missing header', () => {
      const headers = { 'X-Other': 'value' }
      expect(getHeader(headers, 'X-Test')).toBeUndefined()
    })
  })

  describe('getHeaders', () => {
    it('should return multiple headers', () => {
      const headers = { 'X-A': '1', 'x-b': '2' }
      const result = getHeaders(headers, ['X-A', 'X-B'])
      expect(result).toEqual({ 'X-A': '1', 'X-B': '2' })
    })
  })

  describe('hasHeader', () => {
    it('should return true when header exists', () => {
      const headers = { 'x-test': '1' }
      expect(hasHeader(headers, 'X-Test')).toBe(true)
    })

    it('should return false when header missing', () => {
      const headers = {}
      expect(hasHeader(headers, 'X-Test')).toBe(false)
    })
  })
})

// Concrete implementation for testing abstract class
class TestProvider extends BaseProvider {
  readonly name = 'test'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    return this.createSuccess({ received: true })
  }

  // Expose protected methods for testing
  public testCreateFailure(error: string) {
    return this.createFailure(error)
  }

  public testCreateSuccess(payload: unknown, options?: any) {
    return this.createSuccess(payload, options)
  }

  public testSafeParseJson(str: string) {
    return this.safeParseJson(str)
  }

  public testPayloadToString(payload: string | Buffer) {
    return this.payloadToString(payload)
  }
}

describe('BaseProvider', () => {
  describe('createFailure', () => {
    it('should return valid:false with error message', () => {
      const provider = new TestProvider()
      const result = provider.testCreateFailure('oops')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('oops')
    })
  })

  describe('createSuccess', () => {
    it('should return valid:true with payload', () => {
      const provider = new TestProvider()
      const result = provider.testCreateSuccess({ ok: 1 })
      expect(result.valid).toBe(true)
      expect(result.payload).toEqual({ ok: 1 })
    })

    it('should include eventType when provided', () => {
      const provider = new TestProvider()
      const result = provider.testCreateSuccess({}, { eventType: 'evt' })
      expect(result.eventType).toBe('evt')
    })

    it('should include webhookId when provided', () => {
      const provider = new TestProvider()
      const result = provider.testCreateSuccess({}, { webhookId: '123' })
      expect(result.webhookId).toBe('123')
    })
  })

  describe('safeParseJson', () => {
    it('should parse valid JSON', () => {
      const provider = new TestProvider()
      const result = provider.testSafeParseJson('{"a":1}')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ a: 1 })
      }
    })

    it('should return error for invalid JSON', () => {
      const provider = new TestProvider()
      const result = provider.testSafeParseJson('{invalid}')
      expect(result.success).toBe(false)
    })
  })

  describe('payloadToString', () => {
    it('should return string as is', () => {
      const provider = new TestProvider()
      expect(provider.testPayloadToString('test')).toBe('test')
    })

    it('should convert buffer to string', () => {
      const provider = new TestProvider()
      const buf = Buffer.from('test')
      expect(provider.testPayloadToString(buf)).toBe('test')
    })
  })
})
