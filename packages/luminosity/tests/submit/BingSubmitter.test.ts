import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { BingSubmitter } from '../../src/submit/BingSubmitter'

describe('BingSubmitter', () => {
  const defaultConfig = {
    apiKey: 'test-api-key',
    host: 'example.com',
  }

  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constructor', () => {
    it('should use default IndexNow endpoint', () => {
      const submitter = new BingSubmitter(defaultConfig)
      // 驗證建構完成無錯誤
      expect(submitter).toBeDefined()
    })

    it('should accept custom endpoint', () => {
      const submitter = new BingSubmitter({
        ...defaultConfig,
        endpoint: 'https://custom.endpoint/indexnow',
      })
      expect(submitter).toBeDefined()
    })

    it('should configure rate limiter when rateLimit provided', () => {
      const submitter = new BingSubmitter({
        ...defaultConfig,
        rateLimit: { requestsPerSecond: 5 },
      })
      expect(submitter).toBeDefined()
    })
  })

  describe('submitUrls()', () => {
    it('should return success with urlCount 0 for empty array', async () => {
      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls([])

      expect(result.success).toBe(true)
      expect(result.urlCount).toBe(0)
    })

    it('should reject URLs not matching the configured host', async () => {
      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls([
        'https://other-site.com/page1',
        'https://another.com/page2',
      ])

      expect(result.success).toBe(false)
      expect(result.urlCount).toBe(0)
      expect(result.error).toContain('2 URLs do not match host example.com')
    })

    it('should reject invalid URLs', async () => {
      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls(['not-a-valid-url'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('do not match host')
    })

    it('should reject mixed valid and invalid host URLs', async () => {
      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls([
        'https://example.com/valid',
        'https://evil.com/invalid',
      ])

      expect(result.success).toBe(false)
      expect(result.error).toContain('1 URLs do not match host example.com')
    })

    it('should submit valid URLs successfully', async () => {
      globalThis.fetch = async () => new Response('', { status: 200 })

      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls([
        'https://example.com/page1',
        'https://example.com/page2',
      ])

      expect(result.success).toBe(true)
      expect(result.urlCount).toBe(2)
    })

    it('should send correct payload to endpoint', async () => {
      let capturedBody: any = null
      let capturedUrl: string | null = null

      globalThis.fetch = async (url, init) => {
        capturedUrl = url as string
        capturedBody = JSON.parse(init?.body as string)
        return new Response('', { status: 200 })
      }

      const submitter = new BingSubmitter({
        ...defaultConfig,
        endpoint: 'https://test.endpoint/indexnow',
      })

      await submitter.submitUrls(['https://example.com/page1'])

      expect(capturedUrl).toBe('https://test.endpoint/indexnow')
      expect(capturedBody).toEqual({
        host: 'example.com',
        key: 'test-api-key',
        urlList: ['https://example.com/page1'],
      })
    })

    it('should handle HTTP error responses', async () => {
      globalThis.fetch = async () => new Response('Rate limit exceeded', { status: 429 })

      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls(['https://example.com/page1'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 429')
      expect(result.error).toContain('Rate limit exceeded')
      expect(result.statusCode).toBe(429)
    })

    it('should handle network errors', async () => {
      globalThis.fetch = async () => {
        throw new Error('Connection refused')
      }

      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls(['https://example.com/page1'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error: Connection refused')
    })

    it('should handle non-Error thrown values', async () => {
      globalThis.fetch = async () => {
        throw 'string error'
      }

      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls(['https://example.com/page1'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error: string error')
    })

    it('should handle error text extraction failure', async () => {
      globalThis.fetch = async () => {
        const response = new Response(null, { status: 500 })
        // 覆寫 text() 使其拋錯
        response.text = async () => {
          throw new Error('cannot read body')
        }
        return response
      }

      const submitter = new BingSubmitter(defaultConfig)
      const result = await submitter.submitUrls(['https://example.com/page1'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 500')
      expect(result.error).toContain('Unknown error')
    })

    it('should split large batches into chunks of 10000', async () => {
      let callCount = 0

      globalThis.fetch = async () => {
        callCount++
        return new Response('', { status: 200 })
      }

      const submitter = new BingSubmitter(defaultConfig)
      // 建立 15000 個 URL
      const urls = Array.from({ length: 15000 }, (_, i) => `https://example.com/page${i}`)

      const result = await submitter.submitUrls(urls)

      expect(result.success).toBe(true)
      expect(result.urlCount).toBe(15000)
      // 應分成 2 次呼叫 (10000 + 5000)
      expect(callCount).toBe(2)
    })

    it('should stop on first batch failure', async () => {
      let callCount = 0

      globalThis.fetch = async () => {
        callCount++
        if (callCount === 1) {
          return new Response('Server Error', { status: 500 })
        }
        return new Response('', { status: 200 })
      }

      const submitter = new BingSubmitter(defaultConfig)
      const urls = Array.from({ length: 15000 }, (_, i) => `https://example.com/page${i}`)

      const result = await submitter.submitUrls(urls)

      expect(result.success).toBe(false)
      expect(callCount).toBe(1) // 第一批次失敗後停止
    })

    it('should use rate limiter when configured', async () => {
      let callCount = 0

      globalThis.fetch = async () => {
        callCount++
        return new Response('', { status: 200 })
      }

      const submitter = new BingSubmitter({
        ...defaultConfig,
        rateLimit: { requestsPerSecond: 100 },
      })

      const result = await submitter.submitUrls(['https://example.com/page1'])

      expect(result.success).toBe(true)
      expect(callCount).toBe(1)
    })
  })

  describe('validate()', () => {
    it('should return true when API key is valid', async () => {
      globalThis.fetch = async () => new Response('', { status: 200 })

      const submitter = new BingSubmitter(defaultConfig)
      const isValid = await submitter.validate()

      expect(isValid).toBe(true)
    })

    it('should return false when API key is invalid', async () => {
      globalThis.fetch = async () => new Response('Unauthorized', { status: 403 })

      const submitter = new BingSubmitter(defaultConfig)
      const isValid = await submitter.validate()

      expect(isValid).toBe(false)
    })

    it('should submit homepage URL for validation', async () => {
      let capturedBody: any = null

      globalThis.fetch = async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string)
        return new Response('', { status: 200 })
      }

      const submitter = new BingSubmitter(defaultConfig)
      await submitter.validate()

      expect(capturedBody.urlList).toEqual(['https://example.com/'])
    })
  })
})
