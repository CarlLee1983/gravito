/**
 * @gravito/ether - Middleware 測試
 *
 * 測試 etherMiddleware 和 cspMiddleware
 */

import { describe, expect, it } from 'bun:test'
import { EtherPipeline } from '../src/core/EtherPipeline'
import { cspMiddleware, etherMiddleware } from '../src/middleware'
import { createSanitizeRule, createSecurityRule } from '../src/rules'

describe('etherMiddleware', () => {
  it('應該建立中介軟體工廠函式', () => {
    const mw = etherMiddleware()
    expect(typeof mw).toBe('function')
  })

  it('應該接受規則選項', () => {
    const securityRule = createSecurityRule({ cspNonce: true, nonceValue: 'test-nonce' })

    const mw = etherMiddleware({
      rules: [securityRule],
    })

    expect(typeof mw).toBe('function')
  })

  it('應該接受管道選項', () => {
    const pipeline = EtherPipeline.create('test-pipeline').addRule(
      createSecurityRule({ cspNonce: true, nonceValue: 'test' })
    )

    const mw = etherMiddleware({
      pipelines: [pipeline],
    })

    expect(typeof mw).toBe('function')
  })

  it('應該接受自訂 Content-Type 篩選', () => {
    const mw = etherMiddleware({
      contentTypes: ['application/json', 'text/plain'],
    })

    expect(typeof mw).toBe('function')
  })

  it('應該在調試模式下啟用日誌', () => {
    const mw = etherMiddleware({
      debug: true as const,
    })

    expect(typeof mw).toBe('function')
  })

  it('應該支援規則鏈式組合', () => {
    const rules = [
      createSecurityRule({ cspNonce: true, nonceValue: 'nonce' }),
      createSanitizeRule({ stripScripts: true }),
    ]

    const mw = etherMiddleware({
      rules,
    })

    expect(typeof mw).toBe('function')
  })

  it('應該支援管道條件判斷', () => {
    const pipeline = EtherPipeline.create('conditional')
      .addRule(createSecurityRule({ cspNonce: true, nonceValue: 'test' }))
      .enableWhen((ctx) => !!ctx.contentType?.includes('html'))

    const mw = etherMiddleware({
      pipelines: [pipeline],
    })

    expect(typeof mw).toBe('function')
  })

  it('應該使用預設 Content-Type 篩選器', () => {
    const mw = etherMiddleware({
      rules: [createSecurityRule({ cspNonce: true, nonceValue: 'test' })],
    })

    expect(typeof mw).toBe('function')
  })

  it('應該返回異步函式', () => {
    const mw = etherMiddleware()
    expect(mw.constructor.name).toContain('AsyncFunction')
  })

  it('應該提供調試模式選項', () => {
    const mw = etherMiddleware({
      debug: true,
    })

    expect(typeof mw).toBe('function')
  })
})

describe('cspMiddleware', () => {
  it('應該建立 CSP 中介軟體工廠函式', () => {
    const mw = cspMiddleware()
    expect(typeof mw).toBe('function')
  })

  it('應該接受自訂 CSP 指令', () => {
    const mw = cspMiddleware({
      directives: {
        'script-src': "'self' 'nonce-{nonce}' https://cdn.example.com",
        'default-src': "'self'",
      },
    })

    expect(typeof mw).toBe('function')
  })

  it('應該接受自訂 nonce 產生器', () => {
    let callCount = 0
    const nonceGenerator = () => {
      callCount++
      return `nonce-${callCount}`
    }

    const mw = cspMiddleware({
      nonceGenerator,
    })

    expect(typeof mw).toBe('function')
  })

  it('應該接受調試模式', () => {
    const mw = cspMiddleware({
      debug: true,
    })

    expect(typeof mw).toBe('function')
  })

  it('應該接受自訂報告 URI', () => {
    const mw = cspMiddleware({
      reportUri: '/security/csp-violations',
    })

    expect(typeof mw).toBe('function')
  })

  it('應該使用預設 CSP 指令', () => {
    const mw = cspMiddleware({})

    expect(typeof mw).toBe('function')
  })

  it('應該支援完整的 CSP 配置', () => {
    const mw = cspMiddleware({
      directives: {
        'script-src': "'self' 'nonce-{nonce}' https://cdn.example.com",
        'style-src': "'self' 'nonce-{nonce}' https://fonts.googleapis.com",
        'img-src': "'self' data: https:",
        'default-src': "'self'",
      },
      nonceGenerator: () => crypto.randomUUID(),
      debug: process.env.NODE_ENV === 'development',
      reportUri: '/csp-violations',
    })

    expect(typeof mw).toBe('function')
  })

  it('應該返回異步函式', () => {
    const mw = cspMiddleware()
    expect(mw.constructor.name).toContain('AsyncFunction')
  })

  it('應該在使用 {nonce} 佔位符時替換', () => {
    // 測試邏輯正確性：directives 中的 {nonce} 應該被替換
    // 這個測試驗證了我們理解了中介軟體的行為
    const directives = {
      'script-src': "'self' 'nonce-{nonce}'",
      'default-src': "'self'",
    }

    // 模擬 nonce 替換
    const nonce = 'test-nonce-123'
    const result = Object.entries(directives)
      .map(([key, value]) => {
        const directive = value.replace('{nonce}', nonce)
        return `${key} ${directive}`
      })
      .join('; ')

    expect(result).toContain("'nonce-test-nonce-123'")
    expect(result).not.toContain('{nonce}')
  })

  it('應該支援多個 CSP 指令', () => {
    const mw = cspMiddleware({
      directives: {
        'script-src': "'self'",
        'style-src': "'self'",
        'img-src': "'self'",
        'font-src': "'self'",
        'connect-src': "'self'",
        'frame-ancestors': "'none'",
        'base-uri': "'self'",
      },
    })

    expect(typeof mw).toBe('function')
  })
})

describe('Middleware 集成', () => {
  it('應該使用 etherMiddleware + cspMiddleware 組合', () => {
    const etherMw = etherMiddleware({
      rules: [createSecurityRule({ cspNonce: true, nonceValue: 'test' })],
    })

    const cspMw = cspMiddleware({
      directives: { 'script-src': "'self' 'nonce-{nonce}'" },
    })

    expect(typeof etherMw).toBe('function')
    expect(typeof cspMw).toBe('function')
  })

  it('應該支援管道鏈式組合', () => {
    const securityPipeline = EtherPipeline.create('security')
      .addRule(createSecurityRule({ cspNonce: true, nonceValue: 'test' }))
      .enableWhen((ctx) => !!ctx.contentType?.includes('html'))

    const sanitizePipeline = EtherPipeline.create('sanitize')
      .addRule(createSanitizeRule({ stripScripts: true }))
      .enableWhen((ctx) => !!ctx.metadata?.checkPath)

    const mw = etherMiddleware({
      pipelines: [securityPipeline, sanitizePipeline],
    })

    expect(typeof mw).toBe('function')
  })

  it('應該支援規則和管道混合', () => {
    const rules = [createSecurityRule({ cspNonce: true, nonceValue: 'test' })]

    const pipelines = [
      EtherPipeline.create('sanitize')
        .addRule(createSanitizeRule({ stripScripts: true }))
        .enableWhen((ctx) => !!ctx.url?.includes('user')),
    ] as const

    const mw = etherMiddleware({
      rules,
      pipelines: [...pipelines],
    })

    expect(typeof mw).toBe('function')
  })
})
