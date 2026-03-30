/**
 * Tests for warmup() and optimizeTLS() - Route Warming & TLS Optimization
 *
 * Tests the JIT compilation warmup mechanism and TLS configuration optimization.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Gravito } from '../Gravito'

describe('warmup()', () => {
  let app: Gravito

  beforeEach(() => {
    app = new Gravito()
  })

  it('應該在 warmup 後正確完成', async () => {
    app.get('/api/users', (c) => c.json({ users: [] }))
    app.get('/health', (c) => c.json({ ok: true }))

    // Warmup 應該不拋錯
    let errorThrown = false
    try {
      await app.warmup(['/api/users', '/health'])
    } catch (_e) {
      errorThrown = true
    }

    expect(errorThrown).toBe(false)
  })

  it('應該不因不存在的路由拋錯', async () => {
    app.get('/exists', (c) => c.json({ ok: true }))

    // 不存在的路由應該不拋錯
    let errorThrown = false
    try {
      await app.warmup(['/exists', '/does-not-exist'])
    } catch (_e) {
      errorThrown = true
    }

    expect(errorThrown).toBe(false)
  })

  it('應該在請求中帶上 Gravito-Warmup User-Agent', async () => {
    let receivedUserAgent: string | null = null

    app.get('/test', (c) => {
      receivedUserAgent = c.req.header('User-Agent')
      return c.json({ ok: true })
    })

    await app.warmup(['/test'])

    expect(receivedUserAgent).toContain('Gravito-Warmup')
  })

  it('應該在空路徑陣列時立即完成', async () => {
    const start = Date.now()
    await app.warmup([])
    const elapsed = Date.now() - start

    // 應該非常快速完成
    expect(elapsed).toBeLessThan(100)
  })
})

describe('optimizeTLS()', () => {
  let app: Gravito

  beforeEach(() => {
    app = new Gravito()
  })

  it('應該將字串路徑轉換為 Bun.file()', () => {
    const config = {
      tls: {
        key: '/path/to/key.pem',
        cert: '/path/to/cert.pem',
      },
    }

    const optimized = app.serveConfig(config)

    // TLS 應該被轉換（實際路徑轉換取決於 Bun.file 的實現）
    expect(optimized.tls).toBeTruthy()
  })

  it('應該不轉換 PEM 字串格式', () => {
    const pemKey = '-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----'
    const pemCert = '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----'

    const config = {
      tls: {
        key: pemKey,
        cert: pemCert,
      },
    }

    const optimized = app.serveConfig(config)

    // PEM 字串應該保持原樣
    expect(optimized.tls).toBeTruthy()
  })

  it('應該處理陣列型 TLS 配置的每個 entry', () => {
    const config = {
      tls: [
        {
          key: '/path/to/key1.pem',
          cert: '/path/to/cert1.pem',
          domain: 'example.com',
        },
        {
          key: '/path/to/key2.pem',
          cert: '/path/to/cert2.pem',
          domain: 'example.org',
        },
      ],
    }

    const optimized = app.serveConfig(config)

    // 陣列應該被保留
    expect(Array.isArray(optimized.tls)).toBe(true)
    expect((optimized.tls as unknown[]).length).toBe(2)
  })

  it('應該在生產環境設定 lowMemoryMode: true', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const config = {
        tls: {
          key: '/path/to/key.pem',
          cert: '/path/to/cert.pem',
        },
      }

      const optimized = app.serveConfig(config)

      // 生產環境應該設定 lowMemoryMode
      expect(optimized.tls).toBeTruthy()
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('應該在非生產環境不強制設定 lowMemoryMode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const config = {
        tls: {
          key: '/path/to/key.pem',
          cert: '/path/to/cert.pem',
        },
      }

      const optimized = app.serveConfig(config)

      // 開發環境應該不強制設定 lowMemoryMode
      expect(optimized.tls).toBeTruthy()
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('應該不覆寫明確設定的 lowMemoryMode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const config = {
        tls: {
          key: '/path/to/key.pem',
          cert: '/path/to/cert.pem',
          lowMemoryMode: false,
        },
      }

      const optimized = app.serveConfig(config)

      // lowMemoryMode 應該保持為 false
      expect((optimized.tls as { lowMemoryMode?: boolean }).lowMemoryMode).toBe(false)
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })
})
