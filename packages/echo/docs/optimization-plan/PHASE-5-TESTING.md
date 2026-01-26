# Phase 5: 測試與文檔

> 達成 90%+ 測試覆蓋率，建立完整的 API 文檔

## 概述

本階段聚焦於強化測試覆蓋率與完善文檔，確保模組的可靠性與易用性。

## 5.1 測試策略

### 當前測試狀態

```
tests/
└── echo.test.ts    # 單一測試檔案，涵蓋基礎功能
```

**當前覆蓋率評估**: ~75%

### 目標測試結構

```
tests/
├── unit/
│   ├── providers/
│   │   ├── BaseProvider.test.ts
│   │   ├── GenericProvider.test.ts
│   │   ├── GitHubProvider.test.ts
│   │   ├── StripeProvider.test.ts
│   │   ├── ShopifyProvider.test.ts
│   │   ├── SlackProvider.test.ts
│   │   ├── TwilioProvider.test.ts
│   │   ├── PaddleProvider.test.ts
│   │   └── LinearProvider.test.ts
│   ├── receive/
│   │   ├── SignatureValidator.test.ts
│   │   └── WebhookReceiver.test.ts
│   ├── send/
│   │   └── WebhookDispatcher.test.ts
│   ├── storage/
│   │   └── MemoryWebhookStore.test.ts
│   ├── dlq/
│   │   └── MemoryDeadLetterQueue.test.ts
│   └── observability/
│       ├── PrometheusMetricsProvider.test.ts
│       └── ConsoleEchoLogger.test.ts
├── integration/
│   ├── receiver-dispatcher.test.ts
│   ├── store-integration.test.ts
│   └── dlq-integration.test.ts
├── e2e/
│   └── webhook-flow.test.ts
└── fixtures/
    ├── stripe-payloads.ts
    ├── github-payloads.ts
    └── shopify-payloads.ts
```

## 5.2 單元測試規劃

### SignatureValidator 測試

```typescript
describe('SignatureValidator', () => {
  describe('computeHmacSha256', () => {
    it('should compute correct HMAC-SHA256 signature')
    it('should produce consistent signatures for same input')
    it('should produce different signatures for different payloads')
    it('should produce different signatures for different secrets')
    it('should handle empty payload')
    it('should handle Buffer input')
  })

  describe('computeHmacSha256Base64', () => {
    it('should output base64 encoded signature')
    it('should produce correct Shopify-compatible signature')
  })

  describe('computeHmacSha1', () => {
    it('should compute correct HMAC-SHA1 signature')
    it('should produce 40-character hex string')
  })

  describe('computeHmacSha1Base64', () => {
    it('should output base64 encoded SHA1 signature')
    it('should produce correct Twilio-compatible signature')
  })

  describe('timingSafeEqual', () => {
    it('should return true for identical strings')
    it('should return false for different strings')
    it('should return false for strings of different lengths')
    it('should be resistant to timing attacks')
  })

  describe('validateTimestamp', () => {
    it('should accept current timestamp')
    it('should reject timestamp older than tolerance')
    it('should reject timestamp in future beyond tolerance')
    it('should respect custom tolerance value')
    it('should use default 300s tolerance')
  })

  describe('parseStripeSignature', () => {
    it('should parse valid Stripe signature header')
    it('should handle multiple v1 signatures')
    it('should return null for missing timestamp')
    it('should return null for missing signature')
    it('should return null for invalid format')
  })
})
```

### BaseProvider 測試

```typescript
describe('BaseProvider', () => {
  // 使用具體子類別測試 protected 方法
  class TestProvider extends BaseProvider {
    readonly name = 'test'
    async verify() { return this.createSuccess({}) }

    // 暴露 protected 方法供測試
    public testGetHeader = this.getHeader.bind(this)
    public testCreateFailure = this.createFailure.bind(this)
    public testCreateSuccess = this.createSuccess.bind(this)
    public testPayloadToString = this.payloadToString.bind(this)
    public testSafeParseJson = this.safeParseJson.bind(this)
  }

  describe('getHeader', () => {
    it('should return header with exact case match')
    it('should return header with lowercase fallback')
    it('should return first value from array')
    it('should return undefined for missing header')
  })

  describe('createFailure', () => {
    it('should return valid:false with error message')
  })

  describe('createSuccess', () => {
    it('should return valid:true with payload')
    it('should include optional eventType')
    it('should include optional webhookId')
  })

  describe('payloadToString', () => {
    it('should pass through string payload')
    it('should convert Buffer to UTF-8 string')
  })

  describe('safeParseJson', () => {
    it('should parse valid JSON')
    it('should return error for invalid JSON')
    it('should handle empty string')
  })
})
```

### Provider 測試模板

每個 Provider 都應有以下測試：

```typescript
describe('${ProviderName}Provider', () => {
  describe('基本屬性', () => {
    it('should have correct provider name')
    it('should use default tolerance of 300')
    it('should accept custom tolerance')
  })

  describe('signature verification', () => {
    it('should verify valid signature')
    it('should reject invalid signature')
    it('should reject missing signature header')
    it('should reject wrong signature header format')
  })

  describe('timestamp validation', () => {
    it('should accept timestamp within tolerance')
    it('should reject expired timestamp')
    it('should reject future timestamp')
  })

  describe('payload parsing', () => {
    it('should parse valid JSON payload')
    it('should extract event type')
    it('should extract webhook ID')
    it('should handle missing event type')
    it('should reject invalid JSON')
  })

  describe('edge cases', () => {
    it('should handle empty payload')
    it('should handle Unicode content')
    it('should handle large payloads')
  })
})
```

### WebhookReceiver 測試

```typescript
describe('WebhookReceiver', () => {
  describe('provider registration', () => {
    it('should register built-in providers by default')
    it('should register custom provider type')
    it('should register provider with secret')
    it('should throw for unknown provider type')
    it('should allow registering multiple providers')
  })

  describe('event handlers', () => {
    it('should register event-specific handler')
    it('should register global handler with onAll')
    it('should call multiple handlers in order')
    it('should pass correct event object to handlers')
    it('should handle async handlers')
    it('should not call handlers for unmatched events')
  })

  describe('handle()', () => {
    it('should verify and dispatch to handlers')
    it('should return handled:true when handlers called')
    it('should return handled:false when no handlers match')
    it('should reject unregistered provider')
    it('should reject invalid signature')
  })

  describe('verify()', () => {
    it('should verify without calling handlers')
    it('should return verification result')
    it('should reject unregistered provider')
  })

  describe('with store', () => {
    it('should save incoming event to store')
    it('should mark event as processed on success')
    it('should mark event as failed on error')
  })

  describe('with metrics', () => {
    it('should increment incoming counter')
    it('should record duration histogram')
    it('should increment failure counter on verification failure')
  })
})
```

### WebhookDispatcher 測試

```typescript
describe('WebhookDispatcher', () => {
  describe('configuration', () => {
    it('should accept secret in config')
    it('should use default retry config')
    it('should accept custom retry config')
    it('should use default timeout of 30000ms')
    it('should accept custom timeout')
    it('should use default user agent')
    it('should accept custom user agent')
  })

  describe('dispatch()', () => {
    it('should send POST request to URL')
    it('should include correct headers')
    it('should sign payload correctly')
    it('should return success result on 2xx')
    it('should return failure result on non-2xx')
    it('should include response body in result')
    it('should record duration')
  })

  describe('retry logic', () => {
    it('should retry on network error')
    it('should retry on 500 status')
    it('should retry on 502 status')
    it('should retry on 503 status')
    it('should retry on 504 status')
    it('should retry on 429 status')
    it('should NOT retry on 400 status')
    it('should NOT retry on 401 status')
    it('should NOT retry on 404 status')
    it('should respect maxAttempts')
    it('should use exponential backoff')
    it('should cap delay at maxDelay')
  })

  describe('dispatchBatch()', () => {
    it('should dispatch multiple webhooks')
    it('should respect concurrency limit')
    it('should return aggregated results')
    it('should stop on first failure when configured')
    it('should continue on failure by default')
  })

  describe('with DLQ', () => {
    it('should enqueue failed events after max retries')
    it('should not enqueue on non-retryable failure')
  })

  describe('with metrics', () => {
    it('should increment outgoing counter')
    it('should record duration histogram')
    it('should increment retry counter')
    it('should increment failure counter')
  })
})
```

### Storage 測試

```typescript
describe('MemoryWebhookStore', () => {
  describe('saveIncomingEvent', () => {
    it('should generate ID if not provided')
    it('should use provided ID')
    it('should store all event properties')
  })

  describe('saveOutgoingEvent', () => {
    it('should generate ID if not provided')
    it('should store all event properties')
  })

  describe('updateDeliveryAttempt', () => {
    it('should add attempt to outgoing event')
    it('should ignore for incoming events')
    it('should ignore for non-existent events')
  })

  describe('getEvent', () => {
    it('should return stored event')
    it('should return null for non-existent event')
  })

  describe('queryEvents', () => {
    it('should filter by direction')
    it('should filter by provider')
    it('should filter by status')
    it('should filter by date range')
    it('should respect limit and offset')
    it('should sort by date descending')
  })

  describe('markProcessed', () => {
    it('should update status to processed')
  })

  describe('markFailed', () => {
    it('should update status to failed')
    it('should store error message')
  })
})
```

## 5.3 整合測試

```typescript
describe('Integration: Receiver → Dispatcher', () => {
  it('should receive webhook and dispatch to another service')
  it('should preserve event data through the flow')
  it('should handle verification failure gracefully')
  it('should record metrics for full flow')
})

describe('Integration: Store + DLQ', () => {
  it('should store events and move to DLQ on failure')
  it('should retry from DLQ and remove on success')
  it('should update retry count on DLQ retry failure')
})
```

## 5.4 測試工具與 Fixtures

### Fixtures

```typescript
// fixtures/stripe-payloads.ts
export const stripePayloads = {
  paymentIntentSucceeded: {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
      },
    },
  },
  // ... more payloads
}

// fixtures/github-payloads.ts
export const githubPayloads = {
  push: {
    ref: 'refs/heads/main',
    repository: { full_name: 'owner/repo' },
    commits: [{ id: 'abc123', message: 'Initial commit' }],
  },
  // ... more payloads
}
```

### Mock Helpers

```typescript
// fixtures/helpers.ts
export async function createSignedStripePayload(
  payload: unknown,
  secret: string
): Promise<{ body: string; headers: Record<string, string> }> {
  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${body}`
  const signature = await computeHmacSha256(signedPayload, secret)

  return {
    body,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
    },
  }
}

export async function createSignedGitHubPayload(
  payload: unknown,
  secret: string
): Promise<{ body: string; headers: Record<string, string> }> {
  const body = JSON.stringify(payload)
  const signature = await computeHmacSha256(body, secret)

  return {
    body,
    headers: {
      'x-hub-signature-256': `sha256=${signature}`,
      'x-github-event': 'push',
      'x-github-delivery': crypto.randomUUID(),
    },
  }
}
```

## 5.5 文檔規劃

### README 更新

```markdown
# @gravito/echo

> 📡 Enterprise-grade webhook handling for Gravito.

## Features

- **Secure Receiving** - HMAC signature verification, timestamp validation
- **8+ Built-in Providers** - Stripe, GitHub, Shopify, Slack, Twilio, Paddle, Linear, Generic
- **Reliable Sending** - Exponential backoff retry with configurable strategy
- **Batch Dispatch** - Send multiple webhooks with controlled concurrency
- **Persistence** - Pluggable storage for event history
- **Dead Letter Queue** - Isolate and retry failed events
- **Observability** - Metrics, tracing, and structured logging

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Receiving Webhooks](#receiving-webhooks)
4. [Sending Webhooks](#sending-webhooks)
5. [Built-in Providers](#built-in-providers)
6. [Custom Providers](#custom-providers)
7. [Persistence](#persistence)
8. [Dead Letter Queue](#dead-letter-queue)
9. [Batch Dispatch](#batch-dispatch)
10. [Observability](#observability)
11. [API Reference](#api-reference)
12. [Migration Guide](#migration-guide)

## Installation

... (詳細內容)
```

### API 文檔結構

```
docs/
├── optimization-plan/          # 優化計劃（本系列文檔）
├── api/
│   ├── README.md               # API 總覽
│   ├── OrbitEcho.md            # OrbitEcho 類別
│   ├── WebhookReceiver.md      # WebhookReceiver 類別
│   ├── WebhookDispatcher.md    # WebhookDispatcher 類別
│   ├── Providers.md            # Provider 介面與實作
│   ├── Storage.md              # 儲存介面
│   ├── DLQ.md                  # 死信隊列
│   └── Observability.md        # 可觀測性
├── guides/
│   ├── GETTING_STARTED.md      # 快速入門
│   ├── CUSTOM_PROVIDER.md      # 自訂 Provider
│   ├── PRODUCTION.md           # 生產環境建議
│   └── TROUBLESHOOTING.md      # 疑難排解
└── examples/
    ├── stripe-integration.md
    ├── github-integration.md
    └── multi-provider.md
```

### JSDoc 規範

所有公開 API 必須包含完整 JSDoc：

```typescript
/**
 * Webhook Receiver - 管理 webhook provider 並路由到 handler
 *
 * @example 基本使用
 * ```typescript
 * const receiver = new WebhookReceiver()
 * receiver.registerProvider('stripe', process.env.STRIPE_SECRET!)
 * receiver.on('stripe', 'payment_intent.succeeded', handlePayment)
 * ```
 *
 * @example 搭配 Store
 * ```typescript
 * const receiver = new WebhookReceiver()
 * receiver.setStore(new MemoryWebhookStore())
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class WebhookReceiver {
  /**
   * 註冊 webhook provider
   *
   * @param name - Provider 識別名稱
   * @param secret - 用於驗證簽章的 secret
   * @param options - 額外設定
   * @param options.type - Provider 類型，預設使用 name
   * @param options.tolerance - 時間戳容許誤差（秒）
   * @returns this - 支援鏈式呼叫
   *
   * @throws {Error} 當 provider type 不存在時
   *
   * @example
   * ```typescript
   * receiver.registerProvider('stripe', 'whsec_xxx')
   * receiver.registerProvider('custom', 'secret', { type: 'generic' })
   * ```
   */
  registerProvider(
    name: string,
    secret: string,
    options?: { type?: string; tolerance?: number }
  ): this
}
```

## 5.6 測試覆蓋率目標

| 模組 | 當前 | 目標 |
|------|------|------|
| SignatureValidator | ~90% | 100% |
| BaseProvider | 0% | 100% |
| GenericProvider | ~80% | 95%+ |
| StripeProvider | ~70% | 95%+ |
| GitHubProvider | ~80% | 95%+ |
| 新增 Providers | 0% | 95%+ |
| WebhookReceiver | ~85% | 95%+ |
| WebhookDispatcher | ~80% | 95%+ |
| Storage | 0% | 95%+ |
| DLQ | 0% | 95%+ |
| Observability | 0% | 90%+ |
| **總計** | **~75%** | **90%+** |

## 5.7 CI/CD 整合

### 測試腳本

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:coverage": "bun test --coverage --coverage-threshold=90",
    "test:ci": "bun test --coverage --coverage-threshold=90"
  }
}
```

### GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

## 成功標準

- [ ] 測試覆蓋率達到 90%+
- [ ] 所有公開 API 都有 JSDoc
- [ ] README 完整更新
- [ ] 建立 API 文檔目錄
- [ ] 建立使用指南
- [ ] CI 整合覆蓋率檢查

## 風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|---------|
| 測試撰寫耗時 | 中 | 高 | 優先覆蓋核心功能 |
| 文檔過時 | 中 | 中 | 與程式碼同步更新 |
| 覆蓋率難達標 | 低 | 低 | 聚焦關鍵路徑 |

---

**系列完結**

返回 [優化計劃總覽](./README.md)
