# @gravito/ether Middleware - 快速參考

## 安裝和匯入

```typescript
import { etherMiddleware, cspMiddleware } from '@gravito/ether'
import { etherMiddleware, cspMiddleware } from '@gravito/ether/middleware'
```

## 基本用法

### 套用安全規則

```typescript
import { Photon } from '@gravito/photon'
import { etherMiddleware, createSecurityRule } from '@gravito/ether'

const app = new Photon()

app.use('*', etherMiddleware({
  rules: [createSecurityRule({ cspNonce: true, nonceValue: 'my-nonce' })]
}))
```

### CSP 自動 Nonce 注入

```typescript
import { cspMiddleware } from '@gravito/ether'

app.use('*', cspMiddleware({
  directives: {
    'script-src': "'self' 'nonce-{nonce}'",
    'default-src': "'self'"
  },
  nonceGenerator: () => crypto.randomUUID()
}))
```

### 路由特定轉換

```typescript
// 全域安全規則
app.use('*', etherMiddleware({
  rules: [createSecurityRule({ cspNonce: true, nonceValue: 'global' })]
}))

// 只在特定路由消毒
app.use('/user-content/*', etherMiddleware({
  rules: [createSanitizeRule({ stripScripts: true })]
}))
```

### 管道系統（條件性轉換）

```typescript
import { EtherPipeline } from '@gravito/ether'

const securityPipeline = EtherPipeline.create('security')
  .addRule(createSecurityRule({ cspNonce: true, nonceValue: 'test' }))
  .enableWhen((ctx) => ctx.contentType?.includes('html'))

const mw = etherMiddleware({
  pipelines: [securityPipeline]
})

app.use('*', mw)
```

## 配置選項

### etherMiddleware

| 選項 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `rules` | `TransformRule[]` | `[]` | 轉換規則列表 |
| `pipelines` | `EtherPipeline[]` | `[]` | 命名管道列表 |
| `contentTypes` | `string[]` | `['text/html', 'application/xhtml+xml']` | Content-Type 篩選 |
| `debug` | `boolean` | `false` | 調試模式（輸出日誌） |

### cspMiddleware

| 選項 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `directives` | `Record<string, string>` | 見下表 | CSP 指令映射 |
| `nonceGenerator` | `() => string` | `crypto.randomUUID()` | Nonce 產生器 |
| `debug` | `boolean` | `false` | Report-Only 模式 |
| `reportUri` | `string` | `'/csp-report'` | CSP 違規報告 URI |

### CSP 預設指令

```typescript
{
  'script-src': "'self' 'nonce-{nonce}'",
  'style-src': "'self' 'nonce-{nonce}'",
  'default-src': "'self'"
}
```

## 常見場景

### 場景 1: 全域 HTML 安全性

```typescript
app.use('*', etherMiddleware({
  rules: [createSecurityRule({ secureLinkAttrs: true })]
}))
```

### 場景 2: API 安全響應

```typescript
app.use('/api/*', etherMiddleware({
  rules: [createSecurityRule({ cspNonce: true, nonceValue: 'api' })]
}))
```

### 場景 3: 使用者內容消毒

```typescript
app.use('/user/*', etherMiddleware({
  rules: [createSanitizeRule({ stripScripts: true, stripStyles: true })]
}))
```

### 場景 4: 開發環境調試

```typescript
if (process.env.NODE_ENV === 'development') {
  app.use('*', etherMiddleware({
    rules: [securityRule],
    debug: true
  }))
}
```

### 場景 5: 多管道組合

```typescript
const securePipeline = EtherPipeline.create('secure')
  .addRule(createSecurityRule({ cspNonce: true, nonceValue: 'secure' }))

const sanitizePipeline = EtherPipeline.create('sanitize')
  .addRule(createSanitizeRule({ stripScripts: true }))

app.use('*', etherMiddleware({
  pipelines: [securePipeline, sanitizePipeline]
}))
```

## 相容性

- ✅ Hono 所有版本
- ✅ @gravito/photon
- ✅ 與 EtherRewriter 相容
- ✅ 與 EtherService 相容

## 型別安全

所有配置都是完全型別化的:

```typescript
import type { EtherMiddlewareOptions, CSPMiddlewareOptions } from '@gravito/ether'

const etherOptions: EtherMiddlewareOptions = {
  rules: [],
  pipelines: [],
  contentTypes: ['text/html'],
  debug: true
}

const cspOptions: CSPMiddlewareOptions = {
  directives: { 'script-src': "'self'" },
  nonceGenerator: () => 'test',
  debug: true,
  reportUri: '/report'
}
```

## 性能

- 規則套用：委派給最佳化的 Bun HTMLRewriter
- Nonce 產生：O(1) 使用 crypto API
- Content-Type 檢查：O(n) 其中 n 通常 ≤ 3
- 無不必要的複製或記憶體開銷

## 進階

### 自訂 Nonce 策略

```typescript
const cspMw = cspMiddleware({
  nonceGenerator: () => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 8)
    return `${timestamp}-${random}`
  }
})
```

### 條件管道

```typescript
const pipeline = EtherPipeline.create('conditional')
  .addRule(createSecurityRule({ cspNonce: true, nonceValue: 'test' }))
  .enableWhen((ctx) => {
    // 自訂條件邏輯
    return ctx.url?.includes('/api/') ?? false
  })
```

### 調試模式

```typescript
app.use('*', etherMiddleware({
  rules: [securityRule],
  debug: process.env.ETHER_DEBUG === 'true'
}))

// 輸出:
// [EtherMiddleware] Applied 1 rule(s)
// [EtherMiddleware] Transformation complete
```

## 尋求協助

參考完整文檔:
- `ARCHITECTURE.md` - 系統設計
- `examples/middleware-usage.ts` - 6 個完整示例
- `tests/middleware.test.ts` - 測試用例

## 版本

- @gravito/ether >= 1.0.0
- 需要 Hono 或 Photon
