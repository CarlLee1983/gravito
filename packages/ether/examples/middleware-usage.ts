/**
 * @gravito/ether - Middleware 使用示例
 *
 * 展示如何在 Photon/Hono 應用中使用 Ether 中介軟體
 */

import {
  createSanitizeRule,
  createSecurityRule,
  cspMiddleware,
  EtherPipeline,
  etherMiddleware,
} from '@gravito/ether'
import { Photon } from '@gravito/photon'

// ===== 示例 1: 基本使用 - 全域安全規則 =====

function example1() {
  const app = new Photon()

  // 使用 etherMiddleware 套用安全規則
  app.use(
    '*',
    etherMiddleware({
      rules: [
        createSecurityRule({
          cspNonce: true,
          nonceValue: 'example-nonce',
          secureLinkAttrs: true,
        }),
      ],
    })
  )

  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hello</title>
        </head>
        <body>
          <h1>Welcome</h1>
          <p>This HTML will be transformed with security rules.</p>
        </body>
      </html>
    `)
  })

  return app
}

// ===== 示例 2: CSP Middleware - 自動 Nonce 注入 =====

function example2() {
  const app = new Photon()

  // 使用 cspMiddleware 自動生成並注入 nonce
  app.use(
    '*',
    cspMiddleware({
      directives: {
        'script-src': "'self' 'nonce-{nonce}' https://cdn.example.com",
        'style-src': "'self' 'nonce-{nonce}' https://fonts.googleapis.com",
        'img-src': "'self' data: https:",
        'default-src': "'self'",
      },
      nonceGenerator: () => crypto.randomUUID(),
      debug: process.env.NODE_ENV === 'development',
    })
  )

  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial; }
          </style>
        </head>
        <body>
          <script>console.log('Hello');</script>
        </body>
      </html>
    `)
  })

  return app
}

// ===== 示例 3: 路由特定中介軟體 - 消毒使用者內容 =====

function example3() {
  const app = new Photon()

  // 全域安全規則
  app.use(
    '*',
    etherMiddleware({
      rules: [
        createSecurityRule({
          cspNonce: true,
          nonceValue: 'default-nonce',
        }),
      ],
    })
  )

  // 只在 /user-content/* 路由套用消毒規則
  app.use(
    '/user-content/*',
    etherMiddleware({
      rules: [
        createSanitizeRule({
          stripScripts: true,
          stripStyles: true,
        }),
      ],
    })
  )

  app.get('/user-content/:id', (c) => {
    // 這個內容會被消毒（移除 script 和 style）
    const userHtml = '<div>User content<script>alert("xss")</script></div>'
    return c.html(userHtml)
  })

  return app
}

// ===== 示例 4: 管道系統 - 條件性轉換 =====

function example4() {
  const app = new Photon()

  // 建立安全管道
  const securityPipeline = EtherPipeline.create('security')
    .addRule(createSecurityRule({ cspNonce: true, nonceValue: 'sec-nonce' }))
    .enableWhen((ctx) => {
      // 只在 HTML 內容上啟用
      return !!ctx.contentType?.includes('html')
    })

  // 建立消毒管道
  const sanitizePipeline = EtherPipeline.create('sanitize')
    .addRule(createSanitizeRule({ stripScripts: true }))
    .enableWhen((ctx) => {
      // 只在 /api/unsafe/* 路由上啟用
      return !!ctx.url?.includes('/api/unsafe/')
    })

  // 套用管道
  app.use(
    '*',
    etherMiddleware({
      pipelines: [securityPipeline, sanitizePipeline],
    })
  )

  app.get('/api/safe/data', (c) => {
    // 只套用安全管道
    return c.html('<html><body>Safe content</body></html>')
  })

  app.get('/api/unsafe/data', (c) => {
    // 同時套用安全和消毒管道
    return c.html('<html><body>Unsafe user content</body></html>')
  })

  return app
}

// ===== 示例 5: 複雜場景 - 規則和管道混合 =====

function example5() {
  const app = new Photon()

  // 建立管道
  const apiSecurityPipeline = EtherPipeline.create('api-security')
    .addRule(createSecurityRule({ secureLinkAttrs: true }))
    .enableWhen((ctx) => ctx.url?.includes('/api/'))

  const portalSanitizePipeline = EtherPipeline.create('portal-sanitize')
    .addRule(createSanitizeRule({ stripScripts: true, stripStyles: false }))
    .enableWhen((ctx) => ctx.url?.includes('/portal/'))

  // 套用混合中介軟體
  app.use(
    '*',
    etherMiddleware({
      // 全域規則（總是套用）
      rules: [
        createSecurityRule({
          cspNonce: true,
          nonceValue: 'global-nonce',
        }),
      ],
      // 條件管道（選擇性套用）
      pipelines: [apiSecurityPipeline, portalSanitizePipeline],
      // 調試模式
      debug: process.env.DEBUG === 'true',
    })
  )

  // 路由處理器
  app.get('/api/users', (c) => {
    return c.html('<div><a href="/safe">Link</a></div>')
  })

  app.get('/portal/user-posts', (c) => {
    return c.html('<div><p>User post content</p></div>')
  })

  return app
}

// ===== 示例 6: 進階 - 自訂 nonce 產生策略 =====

function example6() {
  // 自訂 nonce 產生器（與請求綁定）
  function _createNonceForRequest(method: string, path: string): string {
    const timestamp = Date.now().toString(36)
    const hash = method.charCodeAt(0).toString(36) + path.length.toString(36)
    return `${timestamp}-${hash}-${Math.random().toString(36).slice(2, 8)}`
  }

  const app = new Photon()

  app.use(
    '*',
    cspMiddleware({
      directives: {
        'script-src': "'self' 'nonce-{nonce}'",
        'style-src': "'self' 'nonce-{nonce}'",
        'default-src': "'self'",
      },
      nonceGenerator: () => crypto.randomUUID(),
      debug: true,
      reportUri: '/api/security/csp-violations',
    })
  )

  app.post('/api/data', (c) => {
    return c.html('<html><body>Data submitted</body></html>')
  })

  return app
}

// 匯出示例
export { example1, example2, example3, example4, example5, example6 }
