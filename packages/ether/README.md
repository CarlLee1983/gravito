# @gravito/ether - Streaming HTML Rewriter for Gravito

基於 Bun 原生 HTMLRewriter 的流式 HTML 轉換引擎，為 Gravito 框架提供高效能、零依賴的 HTML 處理能力。

## 特性

- **基於 Bun HTMLRewriter** - 利用 Bun 原生 SAX-like 解析器
- **流式轉換** - 記憶體使用量恆定，支援無限大小的 HTML
- **零外部依賴** - 不依賴任何第三方代碼，最小化包大小
- **不可變 API** - 函數式設計，遵循 Gravito 架構規範
- **完整 TypeScript 支援** - Strict mode、100% 型別覆蓋
- **靈活的規則系統** - 預定義規則 + 自訂規則工廠
- **Photon 中介軟體整合** - 直接用於 Hono/Photon 應用
- **PlanetCore 容器支援** - 作為 OrbitEther 無縫集成

## 安裝

```bash
npm install @gravito/ether
# 或
bun add @gravito/ether
```

### 可選依賴

`@gravito/core` 是可選的 peerDependency，用於 OrbitEther 整合：

```bash
npm install @gravito/core
```

## 快速開始

### 基礎使用（無 PlanetCore）

轉換 HTML 字串：

```typescript
import { EtherRewriter, createSecurityRule } from '@gravito/ether'

const rewriter = new EtherRewriter()
  .addRule(createSecurityRule({ cspNonce: true }))

const html = '<script>alert()</script><p>content</p>'
const transformed = await rewriter.transformHtml(html)
console.log(transformed) // Script 已加入 nonce
```

轉換 HTTP Response（流式）：

```typescript
const response = new Response('<html><body>test</body></html>', {
  headers: { 'Content-Type': 'text/html' }
})

const transformed = rewriter.transform(response)
// 記憶體使用恆定，無論 HTML 大小
```

### Photon Middleware 整合

在 Photon 應用中使用中介軟體：

```typescript
import { Photon } from '@gravito/photon'
import { etherMiddleware, createSecurityRule } from '@gravito/ether'

const app = new Photon()

// 添加 Ether 中介軟體
app.use('*', etherMiddleware({
  rules: [createSecurityRule({ cspNonce: true })]
}))

// 所有 HTML 回應都會自動轉換
app.get('/', (c) => c.html('<html>...</html>'))
```

CSP nonce 自動注入中介軟體：

```typescript
import { cspMiddleware } from '@gravito/ether'

app.use('*', cspMiddleware({
  directives: {
    'script-src': "'self' 'nonce-{nonce}' https://cdn.example.com",
    'style-src': "'self' 'nonce-{nonce}'"
  }
}))
```

### OrbitEther 容器整合

與 PlanetCore 容器整合：

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitEther } from '@gravito/ether'
import { createSecurityRule, createSeoRule } from '@gravito/ether'

const core = new PlanetCore()

// 註冊 Ether orbit
await core.orbit(new OrbitEther({
  pipelines: {
    security: {
      name: 'security',
      rules: [createSecurityRule({ cspNonce: true })]
    },
    seo: {
      name: 'seo',
      rules: [createSeoRule({
        title: 'My Website',
        description: 'Welcome to my site'
      })],
      enabled: (ctx) => !ctx.url?.startsWith('/api/')
    }
  }
}))

// 通過容器訪問 Ether 服務
const etherService = core.container.resolve(EtherService)
```

## API 文檔

### EtherRewriter

核心 HTML 轉換引擎，提供不可變的流式轉換 API。

#### 建構子

```typescript
constructor(
  rules?: TransformRule[],
  documentRules?: DocumentRule[]
)
```

建立一個新的 EtherRewriter 實例。

#### 方法

**addRule(rule: TransformRule): EtherRewriter**

新增轉換規則（回傳新實例，不可變設計）。

```typescript
const rewriter = new EtherRewriter()
  .addRule(securityRule)
  .addRule(sanitizeRule)
  .addRule(seoRule)
```

**addDocumentRule(rule: DocumentRule): EtherRewriter**

新增文檔級規則（回傳新實例）。

```typescript
const rewriter = new EtherRewriter()
  .addDocumentRule(docRule)
```

**transform(response: Response): Response**

轉換 HTTP Response 物件（流式）。

```typescript
const response = new Response('<div>content</div>')
const transformed = rewriter.transform(response)
```

**transformHtml(html: string): Promise<string>**

轉換 HTML 字串（便利方法，用於測試）。

```typescript
const html = '<p>test</p>'
const result = await rewriter.transformHtml(html)
```

**getRules(): readonly TransformRule[]**

取得已註冊的轉換規則。

**getDocumentRules(): readonly DocumentRule[]**

取得已註冊的文檔級規則。

### EtherPipeline

命名的規則集合，支援條件啟用。

#### 靜態方法

**create(name: string): EtherPipeline**

建立新的命名管道。

```typescript
const pipeline = EtherPipeline.create('security')
```

#### 實例方法

**addRule(rules: TransformRule | TransformRule[]): EtherPipeline**

新增規則到管道（回傳新實例）。

```typescript
const pipeline = EtherPipeline.create('security')
  .addRule(securityRule)
  .addRule(sanitizeRule)
```

**enableWhen(condition: (ctx: PipelineContext) => boolean): EtherPipeline**

設定管道啟用條件（回傳新實例）。

```typescript
const pipeline = EtherPipeline.create('seo')
  .addRule(seoRule)
  .enableWhen((ctx) => !ctx.url?.startsWith('/api/'))
```

**transform(response: Response, context?: PipelineContext): Response**

執行管道轉換。

```typescript
const context = { url: '/page', contentType: 'text/html' }
const result = pipeline.transform(response, context)
```

### EtherService

高階服務，管理命名管道集合。

#### 建構子

```typescript
constructor(config: EtherConfig = {})
```

建立 EtherService，接受配置物件。

#### 方法

**getPipeline(name: string): EtherPipeline | undefined**

取得指定名稱的管道。

**registerPipeline(name: string, pipeline: EtherPipeline): void**

註冊命名管道。

**transform(response: Response, pipelineName: string, context?: PipelineContext): Response**

使用指定管道轉換。

**transform(response: Response): Response**

使用預設管道轉換。

### 內建規則

#### createSecurityRule(options: SecurityRuleOptions)

添加 CSP nonce、安全屬性等安全相關轉換。

```typescript
import { createSecurityRule } from '@gravito/ether'

const rule = createSecurityRule({
  cspNonce: true,
  nonceValue: 'abc123',
  secureLinkAttrs: true
})
```

**選項**:
- `cspNonce?: boolean` - 添加 CSP nonce 到 script/style 標籤
- `nonceValue?: string` - CSP nonce 值
- `integrity?: boolean` - 添加 integrity 屬性到外部資源
- `secureLinkAttrs?: boolean` - 添加安全屬性到連結

#### createSanitizeRule(options: SanitizeRuleOptions)

HTML 消毒，移除或改寫危險內容。

```typescript
import { createSanitizeRule } from '@gravito/ether'

const rule = createSanitizeRule({
  removeScripts: true,
  removeEventHandlers: true,
  removeDataAttributes: false
})
```

**選項**:
- `removeScripts?: boolean` - 移除所有 `<script>` 標籤
- `removeEventHandlers?: boolean` - 移除 on* 屬性
- `removeDataAttributes?: boolean` - 移除 data-* 屬性
- `allowedTags?: string[]` - 允許的標籤白名單

#### createLinkRule(options: LinkRuleOptions)

改寫連結和資源 URL。

```typescript
import { createLinkRule } from '@gravito/ether'

const rule = createLinkRule({
  external: {
    target: '_blank',
    rel: 'noopener noreferrer'
  },
  urlTransform: (url) => {
    // 自訂 URL 轉換邏輯
    return new URL(url, 'https://cdn.example.com').href
  }
})
```

**選項**:
- `external?: { target?: string; rel?: string }` - 外部連結屬性
- `urlTransform?: (url: string) => string` - URL 轉換函式

#### createSeoRule(options: SeoRuleOptions)

添加 SEO 相關的 meta 標籤。

```typescript
import { createSeoRule } from '@gravito/ether'

const rule = createSeoRule({
  title: 'My Awesome Website',
  description: 'Welcome to my site',
  og: {
    title: 'My Awesome Website',
    description: 'Welcome',
    image: 'https://example.com/og.jpg',
    url: 'https://example.com'
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@example'
  },
  lang: 'zh-TW'
})
```

**選項**:
- `title?: string` - 頁面標題
- `description?: string` - 頁面描述
- `og?: OpenGraphOptions` - Open Graph 元標籤
- `twitter?: TwitterCardOptions` - Twitter Card 元標籤
- `lang?: string` - HTML lang 屬性

#### createInjectRule(options: InjectRuleOptions)

動態注入內容。

```typescript
import { createInjectRule } from '@gravito/ether'

const rule = createInjectRule({
  head: '<meta name="custom" content="value">',
  bodyEnd: '<script src="/analytics.js"></script>'
})
```

**選項**:
- `head?: string` - 在 `</head>` 前注入的 HTML
- `bodyStart?: string` - 在 `<body>` 後注入的 HTML
- `bodyEnd?: string` - 在 `</body>` 前注入的 HTML

### Middleware

#### etherMiddleware(options: EtherMiddlewareOptions)

Photon 中介軟體，用於 HTML 轉換。

```typescript
import { etherMiddleware, createSecurityRule } from '@gravito/ether'

app.use('*', etherMiddleware({
  rules: [createSecurityRule({ cspNonce: true })],
  contentTypes: ['text/html'],
  debug: false
}))
```

**選項**:
- `rules?: TransformRule[]` - 轉換規則列表
- `pipelines?: EtherPipeline[]` - 命名管道列表
- `contentTypes?: string[]` - 允許的 Content-Type（預設: ['text/html', 'application/xhtml+xml']）
- `debug?: boolean` - 啟用調試日誌

#### cspMiddleware(options: CSPMiddlewareOptions)

CSP nonce 自動注入中介軟體。

```typescript
import { cspMiddleware } from '@gravito/ether'

app.use('*', cspMiddleware({
  directives: {
    'script-src': "'self' 'nonce-{nonce}'",
    'style-src': "'self' 'nonce-{nonce}'"
  },
  nonceGenerator: () => crypto.randomUUID(),
  debug: false
}))
```

**選項**:
- `directives?: Record<string, string>` - CSP 指令（{nonce} 會被替換）
- `nonceGenerator?: () => string` - Nonce 產生函式
- `reportUri?: string` - CSP 報告 URI
- `debug?: boolean` - 啟用調試日誌

## 使用場景

### 1. 安全防護 - CSP Nonce 注入

```typescript
import { Photon } from '@gravito/photon'
import { cspMiddleware } from '@gravito/ether'

const app = new Photon()

app.use('*', cspMiddleware({
  directives: {
    'script-src': "'self' 'nonce-{nonce}' https://cdn.jsdelivr.net",
    'style-src': "'self' 'nonce-{nonce}'",
    'img-src': "'self' data: https:",
    'default-src': "'self'"
  }
}))
```

### 2. SEO 優化 - Meta 標籤注入

```typescript
import { createSeoRule } from '@gravito/ether'

const seoRule = createSeoRule({
  title: 'My Blog',
  description: 'A great blog about web development',
  og: {
    title: 'My Blog',
    description: 'A great blog',
    image: 'https://example.com/og.jpg',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@myblog'
  },
  lang: 'zh-TW'
})

const rewriter = new EtherRewriter().addRule(seoRule)
```

### 3. XSS 防護 - HTML 消毒

```typescript
import { createSanitizeRule } from '@gravito/ether'

const sanitizeRule = createSanitizeRule({
  removeScripts: true,
  removeEventHandlers: true
})

const rewriter = new EtherRewriter()
  .addRule(createSecurityRule())
  .addRule(sanitizeRule)
```

### 4. 分析追蹤 - 代碼注入

```typescript
import { createInjectRule } from '@gravito/ether'

const analyticsRule = createInjectRule({
  bodyEnd: `
    <script>
      (function() {
        // Google Analytics
        window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};
        ga.l=+new Date;
        ga('create', 'UA-XXXXXXX-X', 'auto');
        ga('send', 'pageview');
      })();
    </script>
    <script async src='https://www.google-analytics.com/analytics.js'></script>
  `
})
```

### 5. 多管道組合 - 根據 URL 條件應用

```typescript
import { Photon } from '@gravito/photon'
import { etherMiddleware } from '@gravito/ether'
import {
  createSecurityRule,
  createSeoRule,
  EtherPipeline
} from '@gravito/ether'

const app = new Photon()

const securityPipeline = EtherPipeline.create('security')
  .addRule(createSecurityRule({ cspNonce: true }))

const seoPipeline = EtherPipeline.create('seo')
  .addRule(createSeoRule({ title: 'My Site' }))
  .enableWhen((ctx) => !ctx.url?.startsWith('/api/'))

app.use('*', etherMiddleware({
  pipelines: [securityPipeline, seoPipeline]
}))
```

## 與其他 Gravito 模組的相容性

| 模組 | 整合方式 | 狀態 |
|------|--------|------|
| **@gravito/core** | OrbitEther 整合（可選 peerDep） | ✅ 完全支援 |
| **@gravito/photon** | Middleware 系統 | ✅ 完全支援 |
| **@gravito/signal** | 郵件 HTML 轉換 | ✅ 相容 |
| **@gravito/atlas** | 資料庫 HTML 欄位轉換 | ✅ 相容 |
| **@gravito/prism** | 可選的高級 Sanitizer | ✅ 可整合 |

## 效能特性

- **流式處理** - Bun HTMLRewriter 採用 SAX-like 解析，記憶體 O(1)
- **轉換時間** - 典型 HTML 頁面 < 1ms
- **包大小** - ESM 10.5 KB（無依賴）
- **無依賴** - 不 bundle 任何第三方代碼

基準測試：

```
轉換 100KB HTML: ~8ms
轉換 1MB HTML: ~85ms
轉換 10MB HTML: ~850ms

記憶體使用: ~2MB（恆定，與大小無關）
```

## 開發

### 本地開發

```bash
cd packages/ether

# 安裝依賴
bun install

# 構建
bun run build

# 測試
bun test

# 測試覆蓋率
bun run test:coverage

# 型別檢查
bun run typecheck

# Lint & Format
bun run check
bun run check:fix
```

### 構建輸出

- `dist/index.js` - ESM 主入口（含 Middleware）
- `dist/middleware/index.js` - Middleware 子導出
- `dist/rules/index.js` - Rules 子導出
- `dist/index.d.ts` - TypeScript 定義（Strict mode）

## 許可證

MIT

## 貢獻

歡迎提交 Pull Request！提交前請確保：

- ✅ TypeScript strict mode 通過（`bun run typecheck`）
- ✅ 所有測試通過（`bun test`）
- ✅ Lint 和格式檢查通過（`bun run check`）
- ✅ 測試覆蓋率 ≥ 80%
- ✅ 新增功能添加相應文檔

## 相關資源

- [Galaxy Architecture 設計](../../docs/claude/design.md)
- [Photon HTTP 引擎](../photon/README.md)
- [PlanetCore 容器](../core/README.md)
- [Bun HTMLRewriter 文檔](https://bun.sh/docs/api/html-rewriter)
