# @gravito/echo

> 📡 Enterprise-grade webhook handling for Gravito. Secure receiving and reliable sending.

## Features

- **Secure Receiving** - HMAC signature verification, timestamp validation
- **Built-in Providers** - Stripe, GitHub, and generic provider support
- **Reliable Sending** - Exponential backoff retry with configurable strategy
- **Gravito Integration** - First-class OrbitEcho module for PlanetCore
- **Request Buffering (v1.1)** - Prevents signature verification failures from framework auto-parsing
- **Circuit Breaker (v1.1)** - Protects downstream services with automatic failure detection
- **Key Rotation (v1.2)** - Zero-downtime key updates with multi-version support

## Installation

```bash
bun add @gravito/echo
```

## Quick Start

### Receiving Webhooks

```typescript
import { OrbitEcho, WebhookReceiver } from '@gravito/echo'

const core = new PlanetCore()

// Install Echo module
core.install(new OrbitEcho({
  providers: {
    stripe: { name: 'stripe', secret: process.env.STRIPE_WEBHOOK_SECRET! },
    github: { name: 'github', secret: process.env.GITHUB_WEBHOOK_SECRET! }
  }
}))

// Get receiver and add handlers
const receiver = core.container.make<WebhookReceiver>('echo.receiver')

// Handle specific events
receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
  console.log('Payment received:', event.payload)
})

receiver.on('github', 'push', async (event) => {
  console.log('Push event:', event.payload)
})
```

### Webhook Endpoint

```typescript
app.post('/webhooks/:provider', async (c) => {
  const provider = c.req.param('provider')
  const body = await c.req.text()
  const headers = c.req.raw.headers

  const receiver = c.get('echo.receiver') as WebhookReceiver
  const result = await receiver.handle(provider, body, Object.fromEntries(headers))

  if (!result.valid) {
    return c.json({ error: result.error }, 401)
  }

  return c.json({ received: true })
})
```

### Sending Webhooks

```typescript
import { WebhookDispatcher } from '@gravito/echo'

const dispatcher = new WebhookDispatcher({
  secret: process.env.OUTGOING_WEBHOOK_SECRET!,
  retry: {
    maxAttempts: 5,
    initialDelay: 1000,
    backoffMultiplier: 2
  }
})

// Send webhook with automatic retry
const result = await dispatcher.dispatch({
  url: 'https://example.com/webhook',
  event: 'order.created',
  data: { orderId: 123, total: 99.99 }
})

if (result.success) {
  console.log('Webhook delivered:', result.statusCode)
} else {
  console.error('Delivery failed:', result.error)
}

// Batch sending
const batchResult = await dispatcher.dispatchBatch([
  { url: 'https://a.com', event: 'e1', data: { id: 1 } },
  { url: 'https://b.com', event: 'e1', data: { id: 2 } }
], { concurrency: 5 })
```

### Persistence & Reliability

Echo supports persistence for audit logs and Dead Letter Queues (DLQ) for failed deliveries.

```typescript
import { 
  OrbitEcho, 
  MemoryWebhookStore, 
  MemoryDeadLetterQueue 
} from '@gravito/echo'

const echo = new OrbitEcho({
  providers: { /* ... */ },
  dispatcher: { /* ... */ },
  // Configure persistence
  store: new MemoryWebhookStore(), // Or your DB implementation
  deadLetterQueue: new MemoryDeadLetterQueue()
})

// Replay failed events
const replayService = new WebhookReplayService(echo.getConfig().store!, echo.getDispatcher()!)
await replayService.replay({ 
  timeRange: { from: new Date(Date.now() - 86400000), to: new Date() },
  dryRun: true 
})

// Observability
const echoWithObservability = new OrbitEcho({
  providers: { /* ... */ },
  observability: {
    logger: new ConsoleEchoLogger(),
    metrics: new PrometheusMetricsProvider(),
    // tracer: opentelemetryTracer
  }
})
```

## Advanced Features (v1.1+)

### Request Buffer Middleware

防止框架自動解析 JSON 導致簽章驗證失敗。預設啟用，會在驗證前緩存原始 request body。

```typescript
const echo = new OrbitEcho({
  providers: { /* ... */ },
  requestBuffer: {
    enabled: true,              // 預設 true
    maxBodySize: 10485760,      // 預設 10MB
    skipContentTypes: [         // 跳過特定 content types
      'multipart/form-data',
      'application/octet-stream'
    ]
  }
})
```

Request Buffer 會自動整合到接收流程，無需額外配置。若需停用：

```typescript
const echo = new OrbitEcho({
  providers: { /* ... */ },
  requestBuffer: { enabled: false }
})
```

### Circuit Breaker

保護下游服務免於雪崩效應，當失敗率超過閾值時自動斷路。

```typescript
import { WebhookDispatcher } from '@gravito/echo'

const dispatcher = new WebhookDispatcher({
  secret: process.env.OUTGOING_WEBHOOK_SECRET!,
  circuitBreaker: {
    enabled: true,              // 預設 true
    failureThreshold: 5,        // 預設 5 次失敗後開路
    successThreshold: 2,        // 預設 2 次成功後關路
    windowSize: 60000,          // 預設 1 分鐘窗口
    openTimeout: 30000,         // 預設 30 秒後嘗試半開
    // 可選的狀態變更回調
    onOpen: (target) => console.log(`Circuit opened for ${target}`),
    onHalfOpen: (target) => console.log(`Circuit half-open for ${target}`),
    onClose: (target) => console.log(`Circuit closed for ${target}`)
  }
})

// 檢查熔斷器狀態
const metrics = dispatcher.getCircuitBreakerMetrics('example.com')
console.log(metrics.state) // 'CLOSED' | 'OPEN' | 'HALF_OPEN'

// 手動重置熔斷器
dispatcher.resetCircuitBreaker('example.com')
```

**熔斷器運作邏輯**：
- **CLOSED（關路）**：正常運作，所有請求通過
- **OPEN（開路）**：失敗次數超過閾值，立即拒絕所有請求
- **HALF_OPEN（半開）**：嘗試恢復，允許有限請求測試服務狀態

每個目標 host 使用獨立的熔斷器，避免單點故障影響全域。

### Key Rotation

支援 Provider 密鑰的動態輪換，無需重啟應用。

```typescript
import { OrbitEcho } from '@gravito/echo'

const echo = new OrbitEcho({
  // 啟用密鑰輪換功能
  keyRotation: {
    enabled: true,
    autoCleanup: true,          // 自動清理過期密鑰
    gracePeriod: 86400000,      // 24 小時寬限期
    onRotate: (provider, newKey) => {
      console.log(`Key rotated for ${provider}: ${newKey.version}`)
    }
  },
  // 使用多密鑰配置 Provider
  providers: {
    stripe: {
      name: 'stripe',
      secret: '', // 主密鑰會從 keys 中自動設定
      keys: [
        {
          key: 'whsec_new_key',
          version: 'v2',
          isPrimary: true,
          activeFrom: new Date('2026-01-15')
        },
        {
          key: 'whsec_old_key',
          version: 'v1',
          isPrimary: false,
          activeFrom: new Date('2025-01-01'),
          expiresAt: new Date('2026-02-15') // 寬限期結束時間
        }
      ]
    }
  }
})

// 執行密鑰輪換
await echo.rotateProviderKey('stripe', {
  key: 'whsec_newest_key',
  version: 'v3',
  activeFrom: new Date()
})
```

**密鑰輪換運作邏輯**：
1. 在輪換期間，系統同時接受新舊密鑰驗證
2. 舊主密鑰自動降級為輔助密鑰，並設定過期時間（當前時間 + gracePeriod）
3. 新密鑰成為主密鑰，用於所有新的簽章驗證
4. 過期密鑰會自動清理（若啟用 autoCleanup）

這確保了正在傳輸中的 Webhook 不會因密鑰輪換而失敗。

## Providers

### Built-in Providers

| Provider | Signature Method | Header |
|----------|-----------------|--------|
| `stripe` | HMAC-SHA256 + Timestamp | `Stripe-Signature` |
| `github` | HMAC-SHA256 | `X-Hub-Signature-256` |
| `generic` | HMAC-SHA256 | `X-Webhook-Signature` |
| `shopify` | HMAC-SHA256 (base64) | `X-Shopify-Hmac-Sha256` |
| `twilio` | HMAC-SHA1 (base64) | `X-Twilio-Signature` |
| `slack` | HMAC-SHA256 + Timestamp | `X-Slack-Signature` |
| `paddle` | HMAC-SHA256 + Timestamp | `Paddle-Signature` |
| `linear` | HMAC-SHA256 | `Linear-Signature` |

### Custom Provider

```typescript
import { WebhookProvider, WebhookReceiver } from '@gravito/echo'

class MyProvider implements WebhookProvider {
  readonly name = 'my-provider'

  async verify(payload, headers, secret) {
    // Custom verification logic
    return { valid: true, payload: JSON.parse(payload) }
  }
}

receiver.registerProviderType('my-provider', MyProvider)
receiver.registerProvider('custom', 'secret', { type: 'my-provider' })
```

## Configuration

For detailed API information, please refer to the [API Documentation](./docs/api/README.md).

### WebhookDispatcher

```typescript
interface WebhookDispatcherConfig {
  /** Secret for signing outgoing webhooks */
  secret: string

  /** Retry configuration */
  retry?: {
    maxAttempts?: number      // default: 3
    initialDelay?: number     // default: 1000ms
    backoffMultiplier?: number // default: 2
    maxDelay?: number         // default: 300000ms (5min)
    retryableStatuses?: number[] // default: [408, 429, 500, 502, 503, 504]
  }

  /** Request timeout in ms */
  timeout?: number  // default: 30000

  /** Custom User-Agent */
  userAgent?: string

  /** Circuit breaker configuration (v1.1+) */
  circuitBreaker?: {
    enabled?: boolean           // default: true
    failureThreshold?: number   // default: 5
    successThreshold?: number   // default: 2
    windowSize?: number         // default: 60000 (1 minute)
    openTimeout?: number        // default: 30000 (30 seconds)
    onOpen?: (target: string) => void
    onHalfOpen?: (target: string) => void
    onClose?: (target: string) => void
  }
}
```

### OrbitEcho

```typescript
interface EchoConfig {
  /** Registered webhook providers */
  providers?: Record<string, {
    name: string
    secret: string
    tolerance?: number  // timestamp tolerance in seconds
    // Key rotation support (v1.2+)
    keys?: Array<{
      key: string
      version: string
      isPrimary: boolean
      activeFrom: Date
      expiresAt?: Date
    }>
  }>

  /** Dispatcher configuration */
  dispatcher?: WebhookDispatcherConfig

  /** Base path for webhook endpoints */
  basePath?: string  // default: '/webhooks'

  /** Request buffer configuration (v1.1+) */
  requestBuffer?: {
    enabled?: boolean           // default: true
    maxBodySize?: number        // default: 10485760 (10MB)
    skipContentTypes?: string[] // default: ['multipart/form-data', 'application/octet-stream']
  }

  /** Key rotation configuration (v1.2+) */
  keyRotation?: {
    enabled?: boolean           // default: false
    autoCleanup?: boolean       // default: true
    gracePeriod?: number        // default: 86400000 (24 hours)
    onRotate?: (providerName: string, newKey: ProviderKeyEntry) => void
  }
}
```

## License

MIT
