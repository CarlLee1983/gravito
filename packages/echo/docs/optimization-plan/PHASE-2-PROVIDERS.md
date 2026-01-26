# Phase 2: Provider 擴展

> 擴展內建 Provider 支援，涵蓋主流 Webhook 服務

## 概述

本階段將新增多個常用的 Webhook Provider，讓開發者無需手動實作即可快速整合主流服務。

## 目標 Provider 清單

根據業界使用頻率與企業需求，規劃新增以下 Provider：

| Provider | 用途 | 優先級 | 簽章方法 |
|----------|------|--------|---------|
| Shopify | 電商 | P0 | HMAC-SHA256 (base64) |
| Twilio | 通訊 | P0 | HMAC-SHA1 (base64) |
| Slack | 協作 | P1 | HMAC-SHA256 + timestamp |
| Paddle | 支付 | P1 | HMAC-SHA256 |
| Linear | 專案管理 | P2 | HMAC-SHA256 |
| Clerk | 身份驗證 | P2 | Svix 格式 |
| Discord | 社群 | P2 | Ed25519 |
| SendGrid | 郵件 | P3 | ECDSA-SHA256 |

## 詳細設計

### 2.1 Shopify Provider

**簽章格式**: HMAC-SHA256，base64 編碼

**Header**:
- `X-Shopify-Hmac-Sha256`: base64 編碼的 HMAC 簽章
- `X-Shopify-Topic`: 事件類型
- `X-Shopify-Shop-Domain`: 商店網域
- `X-Shopify-Webhook-Id`: Webhook ID

```typescript
/**
 * Shopify webhook provider
 * @see https://shopify.dev/docs/apps/webhooks/configuration/https#verify-webhook
 */
export class ShopifyProvider extends BaseProvider {
  readonly name = 'shopify'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // 取得簽章
    const signature = this.getHeader(headers, 'x-shopify-hmac-sha256')
    if (!signature) {
      return this.createFailure('Missing X-Shopify-Hmac-Sha256 header')
    }

    // 計算預期簽章 (base64)
    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256Base64(payloadStr, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    // 解析 payload
    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    return this.createSuccess(parseResult.data, {
      eventType: this.getHeader(headers, 'x-shopify-topic'),
      webhookId: this.getHeader(headers, 'x-shopify-webhook-id'),
    })
  }
}
```

### 2.2 Twilio Provider

**簽章格式**: HMAC-SHA1，base64 編碼（傳統）或 HMAC-SHA256（新版 Signature Validation）

**Header**:
- `X-Twilio-Signature`: HMAC-SHA1 簽章

**特殊處理**:
- 需要完整 URL + 排序後的 POST 參數

```typescript
/**
 * Twilio webhook provider
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio'

  private baseUrl?: string

  constructor(options: ProviderOptions & { baseUrl?: string } = {}) {
    super(options)
    this.baseUrl = options.baseUrl
  }

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-twilio-signature')
    if (!signature) {
      return this.createFailure('Missing X-Twilio-Signature header')
    }

    // Twilio 需要 URL + sorted params
    const url = this.baseUrl ?? ''
    const payloadStr = this.payloadToString(payload)

    // 解析 form data 並排序
    const params = new URLSearchParams(payloadStr)
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}${value}`)
      .join('')

    const signaturePayload = url + sortedParams
    const expectedSignature = await computeHmacSha1Base64(signaturePayload, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    return this.createSuccess(Object.fromEntries(params), {
      eventType: params.get('EventType') ?? undefined,
    })
  }
}
```

### 2.3 Slack Provider

**簽章格式**: HMAC-SHA256 + timestamp

**Header**:
- `X-Slack-Request-Timestamp`: 請求時間戳
- `X-Slack-Signature`: `v0=<sha256_hex>`

```typescript
/**
 * Slack webhook provider
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export class SlackProvider extends BaseProvider {
  readonly name = 'slack'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-slack-signature')
    const timestampStr = this.getHeader(headers, 'x-slack-request-timestamp')

    if (!signature) {
      return this.createFailure('Missing X-Slack-Signature header')
    }
    if (!timestampStr) {
      return this.createFailure('Missing X-Slack-Request-Timestamp header')
    }

    // 驗證簽章格式
    if (!signature.startsWith('v0=')) {
      return this.createFailure('Invalid signature format (expected v0=...)')
    }

    // 驗證時間戳
    const timestamp = parseInt(timestampStr, 10)
    if (!validateTimestamp(timestamp, this.tolerance)) {
      return this.createFailure(`Timestamp outside tolerance window (${this.tolerance}s)`)
    }

    // 計算簽章: v0:timestamp:body
    const payloadStr = this.payloadToString(payload)
    const sigBasestring = `v0:${timestamp}:${payloadStr}`
    const expectedSignature = await computeHmacSha256(sigBasestring, secret)

    if (!timingSafeEqual(signature.slice(3), expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    // 解析 payload
    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    const data = parseResult.data as Record<string, unknown>
    return this.createSuccess(data, {
      eventType: data.type as string | undefined,
      webhookId: data.event_id as string | undefined,
    })
  }
}
```

### 2.4 Paddle Provider

**簽章格式**: HMAC-SHA256

**Header**:
- `Paddle-Signature`: `ts=timestamp;h1=signature`

```typescript
/**
 * Paddle webhook provider
 * @see https://developer.paddle.com/webhooks/signature-verification
 */
export class PaddleProvider extends BaseProvider {
  readonly name = 'paddle'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signatureHeader = this.getHeader(headers, 'paddle-signature')
    if (!signatureHeader) {
      return this.createFailure('Missing Paddle-Signature header')
    }

    // 解析 ts=xxx;h1=xxx 格式
    const parsed = this.parsePaddleSignature(signatureHeader)
    if (!parsed) {
      return this.createFailure('Invalid Paddle-Signature format')
    }

    const { timestamp, signature } = parsed

    // 驗證時間戳
    if (!validateTimestamp(timestamp, this.tolerance)) {
      return this.createFailure(`Timestamp outside tolerance window (${this.tolerance}s)`)
    }

    // 計算簽章
    const payloadStr = this.payloadToString(payload)
    const signedPayload = `${timestamp}:${payloadStr}`
    const expectedSignature = await computeHmacSha256(signedPayload, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    const data = parseResult.data as Record<string, unknown>
    return this.createSuccess(data, {
      eventType: data.event_type as string | undefined,
      webhookId: data.event_id as string | undefined,
    })
  }

  private parsePaddleSignature(header: string): { timestamp: number; signature: string } | null {
    const parts = header.split(';')
    let timestamp: number | undefined
    let signature: string | undefined

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key === 'ts' && value) {
        timestamp = parseInt(value, 10)
      } else if (key === 'h1' && value) {
        signature = value
      }
    }

    if (timestamp === undefined || !signature) {
      return null
    }

    return { timestamp, signature }
  }
}
```

### 2.5 Linear Provider

**簽章格式**: HMAC-SHA256

**Header**:
- `Linear-Signature`: HMAC-SHA256 hex
- `Linear-Delivery`: 傳送 ID

```typescript
/**
 * Linear webhook provider
 * @see https://developers.linear.app/docs/graphql/webhooks#signature-verification
 */
export class LinearProvider extends BaseProvider {
  readonly name = 'linear'

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'linear-signature')
    if (!signature) {
      return this.createFailure('Missing Linear-Signature header')
    }

    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    if (!timingSafeEqual(signature, expectedSignature)) {
      return this.createFailure('Signature verification failed')
    }

    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createFailure(parseResult.error)
    }

    const data = parseResult.data as Record<string, unknown>
    return this.createSuccess(data, {
      eventType: (data.type ?? data.action) as string | undefined,
      webhookId: this.getHeader(headers, 'linear-delivery'),
    })
  }
}
```

## 新增簽章工具函數

需要在 `SignatureValidator.ts` 新增 base64 輸出版本：

```typescript
/**
 * 計算 HMAC-SHA256 並輸出 base64
 */
export async function computeHmacSha256Base64(
  payload: string | Buffer,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const payloadBuffer =
    typeof payload === 'string'
      ? new TextEncoder().encode(payload)
      : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)

  const signature = await crypto.subtle.sign('HMAC', key, payloadBuffer)
  return Buffer.from(signature).toString('base64')
}

/**
 * 計算 HMAC-SHA1 並輸出 base64（用於 Twilio 等傳統服務）
 */
export async function computeHmacSha1Base64(
  payload: string | Buffer,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const payloadBuffer =
    typeof payload === 'string'
      ? new TextEncoder().encode(payload)
      : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)

  const signature = await crypto.subtle.sign('HMAC', key, payloadBuffer)
  return Buffer.from(signature).toString('base64')
}
```

## Provider 註冊更新

**檔案**: `src/receive/WebhookReceiver.ts`

```typescript
constructor() {
  // 既有 Provider
  this.registerProviderType('generic', GenericProvider)
  this.registerProviderType('stripe', StripeProvider)
  this.registerProviderType('github', GitHubProvider)

  // 新增 Provider
  this.registerProviderType('shopify', ShopifyProvider)
  this.registerProviderType('twilio', TwilioProvider)
  this.registerProviderType('slack', SlackProvider)
  this.registerProviderType('paddle', PaddleProvider)
  this.registerProviderType('linear', LinearProvider)
}
```

## 檔案結構更新

```
src/
├── providers/
│   ├── base/
│   │   ├── BaseProvider.ts
│   │   └── HeaderUtils.ts
│   ├── GenericProvider.ts
│   ├── GitHubProvider.ts
│   ├── StripeProvider.ts
│   ├── ShopifyProvider.ts     # 新增
│   ├── TwilioProvider.ts      # 新增
│   ├── SlackProvider.ts       # 新增
│   ├── PaddleProvider.ts      # 新增
│   ├── LinearProvider.ts      # 新增
│   └── index.ts
```

## 測試策略

每個新 Provider 需包含以下測試：

```typescript
describe('ShopifyProvider', () => {
  it('should have correct name')
  it('should reject missing signature header')
  it('should verify valid signature')
  it('should reject invalid signature')
  it('should extract event type from header')
  it('should extract webhook ID from header')
  it('should handle malformed JSON')
})
```

### 整合測試

```typescript
describe('Provider Integration', () => {
  it('should register all built-in providers')

  describe.each([
    'generic', 'stripe', 'github',
    'shopify', 'twilio', 'slack', 'paddle', 'linear'
  ])('%s provider', (providerName) => {
    it('should be registered by default')
    it('should verify valid webhooks')
    it('should reject invalid signatures')
  })
})
```

## 文檔更新

### README Provider 表格

```markdown
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
```

## 成功標準

- [ ] 新增 5 個 Provider（Shopify、Twilio、Slack、Paddle、Linear）
- [ ] 每個 Provider 測試覆蓋率 95%+
- [ ] 所有 Provider 都繼承 `BaseProvider`
- [ ] 更新 README 文檔
- [ ] 新增 base64 簽章函數並測試
- [ ] 向後相容，無破壞性變更

## 風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|---------|
| 第三方 API 變更 | 中 | 低 | 追蹤官方文檔，版本化實作 |
| 測試環境不足 | 中 | 中 | 建立 mock 服務，使用官方測試案例 |
| 套件大小增加 | 低 | 中 | Tree-shaking 支援 |

---

**下一階段**: [Phase 3: 功能增強](./PHASE-3-FEATURES.md)
