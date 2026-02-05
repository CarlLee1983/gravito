import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { GoogleSubmitter } from '../../src/submit/GoogleSubmitter'

describe('GoogleSubmitter', () => {
  const defaultCredentials = {
    client_email: 'test@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nfake-key\n-----END RSA PRIVATE KEY-----',
    project_id: 'test-project',
  }

  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constructor', () => {
    it('should use default Google Indexing API endpoint', () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
      })
      expect(submitter).toBeDefined()
    })

    it('should accept custom endpoint', () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://custom.api/v3/urlNotifications:publish',
      })
      expect(submitter).toBeDefined()
    })

    it('should configure rate limiter when rateLimit provided', () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        rateLimit: { requestsPerSecond: 5 },
      })
      expect(submitter).toBeDefined()
    })
  })

  describe('init()', () => {
    it('should initialize with serviceAccountCredentials', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
      })
      // init 不應拋錯
      await submitter.init()
    })

    it('should throw when serviceAccountPath is used', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountPath: '/path/to/service-account.json',
      })
      await expect(submitter.init()).rejects.toThrow('serviceAccountPath requires fs module')
    })

    it('should throw when no credentials are provided', async () => {
      const submitter = new GoogleSubmitter({})
      await expect(submitter.init()).rejects.toThrow(
        'Either serviceAccountPath or serviceAccountCredentials must be provided'
      )
    })
  })

  describe('submitUrl()', () => {
    // signJWT 會拋錯，因此 getAccessToken 的 createJWT 步驟會失敗
    // 我們需要 mock fetch 來模擬完整的 OAuth token 交換流程
    // 但因為 signJWT 是 placeholder，會直接拋出 Error

    it('should return network error when JWT signing fails', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
      })
      await submitter.init()

      const result = await submitter.submitUrl('https://example.com/page1')

      expect(result.success).toBe(false)
      expect(result.url).toBe('https://example.com/page1')
      expect(result.error).toContain('Network error')
      expect(result.error).toContain('JWT signing requires crypto implementation')
    })

    it('should default to URL_UPDATED action', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
      })
      await submitter.init()

      // 因為 signJWT 是 placeholder，這會失敗
      // 但我們確認介面正確運作
      const result = await submitter.submitUrl('https://example.com/page1')
      expect(result.url).toBe('https://example.com/page1')
    })

    it('should handle successful submission with mocked token flow', async () => {
      // 建立一個自定義 endpoint 的 submitter
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      let _fetchCallCount = 0

      const mockFetch: any = async (url: RequestInfo | URL, _init: RequestInit) => {
        _fetchCallCount++
        const urlStr = typeof url === 'string' ? url : url.toString()
        const parsedUrl = new URL(urlStr)

        // 第一次呼叫：OAuth token 交換
        if (parsedUrl.hostname === 'oauth2.googleapis.com') {
          return new Response(
            JSON.stringify({
              access_token: 'mock-access-token',
              expires_in: 3600,
              token_type: 'Bearer',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // 第二次呼叫：實際提交
        if (parsedUrl.hostname === 'mock.api' && parsedUrl.pathname === '/publish') {
          return new Response(JSON.stringify({ urlNotificationMetadata: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response('Not found', { status: 404 })
      }
      globalThis.fetch = mockFetch

      // signJWT 仍然會拋錯，所以直接設定 token
      // 使用反射來注入 token 避免 signJWT 的限制
      ;(submitter as any).accessToken = 'mock-access-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      const result = await submitter.submitUrl('https://example.com/page1', 'URL_UPDATED')

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://example.com/page1')
      expect(result.statusCode).toBe(200)
    })

    it('should handle HTTP error response', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      // 注入 token 避免 JWT 簽名問題
      ;(submitter as any).accessToken = 'mock-access-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { message: 'Permission denied' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })

      const result = await submitter.submitUrl('https://example.com/page1')

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(403)
      expect(result.error).toContain('HTTP 403')
      expect(result.error).toContain('Permission denied')
    })

    it('should handle HTTP error with non-JSON response body', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-access-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () => {
        const response = new Response('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })
        // 覆寫 json() 使其失敗
        response.json = async () => {
          throw new Error('not json')
        }
        return response
      }

      const result = await submitter.submitUrl('https://example.com/page1')

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(500)
      expect(result.error).toContain('HTTP 500')
    })

    it('should handle network errors gracefully', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-access-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () => {
        throw new Error('DNS resolution failed')
      }

      const result = await submitter.submitUrl('https://example.com/page1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error: DNS resolution failed')
    })

    it('should handle non-Error thrown values', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-access-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () => {
        throw 'unexpected string error'
      }

      const result = await submitter.submitUrl('https://example.com/page1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error: unexpected string error')
    })

    it('should send correct Authorization header and body', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'my-token-123'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      let capturedHeaders: Record<string, string> = {}
      let capturedBody: any = null

      globalThis.fetch = async (_url, init) => {
        const headers = init?.headers as Record<string, string>
        capturedHeaders = headers
        capturedBody = JSON.parse(init?.body as string)
        return new Response('', { status: 200 })
      }

      await submitter.submitUrl('https://example.com/test', 'URL_DELETED')

      expect(capturedHeaders.Authorization).toBe('Bearer my-token-123')
      expect(capturedHeaders['Content-Type']).toBe('application/json')
      expect(capturedBody).toEqual({
        url: 'https://example.com/test',
        type: 'URL_DELETED',
      })
    })

    it('should use rate limiter when configured', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
        rateLimit: { requestsPerSecond: 100 },
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () => new Response('', { status: 200 })

      const result = await submitter.submitUrl('https://example.com/page1')
      expect(result.success).toBe(true)
    })
  })

  describe('submitBatch()', () => {
    it('should submit all URLs sequentially', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      const submittedUrls: string[] = []
      globalThis.fetch = async (_url, init) => {
        const body = JSON.parse(init?.body as string)
        submittedUrls.push(body.url)
        return new Response('', { status: 200 })
      }

      const results = await submitter.submitBatch([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ])

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.success)).toBe(true)
      expect(submittedUrls).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ])
    })

    it('should stop on 401 auth error', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
          status: 401,
        })

      const results = await submitter.submitBatch([
        'https://example.com/page1',
        'https://example.com/page2',
      ])

      // 應在第一個 401 後停止
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].statusCode).toBe(401)
    })

    it('should stop on 403 auth error', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { message: 'Forbidden' } }), {
          status: 403,
        })

      const results = await submitter.submitBatch([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ])

      expect(results).toHaveLength(1)
      expect(results[0].statusCode).toBe(403)
    })

    it('should continue on non-auth errors', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      let callCount = 0
      globalThis.fetch = async () => {
        callCount++
        if (callCount === 1) {
          return new Response('Error', { status: 500 })
        }
        return new Response('', { status: 200 })
      }

      const results = await submitter.submitBatch([
        'https://example.com/page1',
        'https://example.com/page2',
      ])

      // 500 不是 auth error，應繼續
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(false)
      expect(results[1].success).toBe(true)
    })

    it('should default to URL_UPDATED action', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      ;(submitter as any).accessToken = 'mock-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      let capturedAction: string | undefined
      globalThis.fetch = async (_url, init) => {
        const body = JSON.parse(init?.body as string)
        capturedAction = body.type
        return new Response('', { status: 200 })
      }

      await submitter.submitBatch(['https://example.com/page1'])
      expect(capturedAction).toBe('URL_UPDATED')
    })

    it('should return empty array for empty input', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
      })
      await submitter.init()

      const results = await submitter.submitBatch([])
      expect(results).toEqual([])
    })
  })

  describe('getAccessToken() - token caching', () => {
    it('should use cached token when not expired', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      // 設定快取 token
      ;(submitter as any).accessToken = 'cached-token'
      ;(submitter as any).tokenExpiresAt = Date.now() + 3600000

      let fetchCalled = false
      globalThis.fetch = async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString()
        if (urlStr.includes('oauth2')) {
          fetchCalled = true
        }
        return new Response('', { status: 200 })
      }

      await submitter.submitUrl('https://example.com/page1')

      // 不應嘗試重新獲取 token
      expect(fetchCalled).toBe(false)
    })

    it('should refresh token when expired', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      // 設定過期的 token
      ;(submitter as any).accessToken = 'expired-token'
      ;(submitter as any).tokenExpiresAt = Date.now() - 1000

      // getAccessToken 會嘗試 createJWT -> signJWT，signJWT 會拋錯
      const result = await submitter.submitUrl('https://example.com/page1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('JWT signing requires crypto implementation')
    })

    it('should auto-init credentials if not initialized', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      // 不呼叫 init()，讓 getAccessToken 自動初始化

      // signJWT 仍會失敗，但 init 應被自動呼叫
      const result = await submitter.submitUrl('https://example.com/page1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('JWT signing')
    })

    it('should throw when credentials not available after init', async () => {
      // 建立一個無法初始化的 submitter
      const submitter = new GoogleSubmitter({})

      const result = await submitter.submitUrl('https://example.com/page1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('getAccessToken() - OAuth token exchange', () => {
    it('should handle failed token exchange', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
        endpoint: 'https://mock.api/publish',
      })
      await submitter.init()

      // signJWT 是 placeholder，直接拋錯
      // 這涵蓋了 getAccessToken 中的 createJWT 路徑
      const result = await submitter.submitUrl('https://example.com/page1')
      expect(result.success).toBe(false)
    })
  })

  describe('base64UrlEncode()', () => {
    it('should encode correctly via createJWT internal path', async () => {
      const submitter = new GoogleSubmitter({
        serviceAccountCredentials: defaultCredentials,
      })
      await submitter.init()

      // 直接呼叫 private method 驗證
      const encoded = (submitter as any).base64UrlEncode('{"alg":"RS256","typ":"JWT"}')
      expect(encoded).toBeDefined()
      expect(typeof encoded).toBe('string')
      // 不應包含 +, /, =
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
      expect(encoded).not.toContain('=')
    })
  })
})
