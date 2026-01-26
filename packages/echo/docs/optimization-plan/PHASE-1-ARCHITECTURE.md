# Phase 1: 架構優化

> 消除重複代碼，建立可擴展的 Provider 基礎架構

## 概述

本階段聚焦於提升程式碼品質與架構設計，主要目標是消除 Provider 間的重複代碼，並建立統一的基礎類別以利後續擴展。

## 當前架構問題

### 1. Provider 重複代碼

三個現有 Provider 都包含相同的 `getHeader` 輔助方法：

```typescript
// GenericProvider.ts (L103-108)
private getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

// GitHubProvider.ts (L90-96) - 完全相同
// StripeProvider.ts (L112-118) - 完全相同
```

**問題**:
- 違反 DRY 原則
- 維護時需同步修改多處
- 新增 Provider 時容易遺漏

### 2. 缺乏 Provider 基礎類別

目前各 Provider 直接實作 `WebhookProvider` 介面，導致：
- 無法共享通用邏輯
- 難以統一錯誤處理
- 缺乏一致的日誌格式

### 3. 簽章驗證分散

簽章相關邏輯分散在 `SignatureValidator.ts` 和各 Provider 中，可以更好地組織。

## 目標架構

### 新增檔案結構

```
src/
├── providers/
│   ├── base/
│   │   ├── BaseProvider.ts       # 抽象基礎類別 (新增)
│   │   └── HeaderUtils.ts        # Header 處理工具 (新增)
│   ├── GenericProvider.ts        # 繼承 BaseProvider
│   ├── GitHubProvider.ts         # 繼承 BaseProvider
│   ├── StripeProvider.ts         # 繼承 BaseProvider
│   └── index.ts
├── receive/
│   ├── SignatureValidator.ts
│   ├── WebhookReceiver.ts
│   └── index.ts
└── ...
```

## 實作任務

### Task 1.1: 建立 Header 工具模組

**檔案**: `src/providers/base/HeaderUtils.ts`

```typescript
/**
 * Webhook Header 處理工具
 * @module @gravito/echo/providers/base
 */

/**
 * 從 headers 物件中取得指定 header 的值
 * 支援大小寫不敏感的查找
 */
export function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  // 先嘗試原始名稱，再嘗試小寫
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

/**
 * 取得多個 header 值
 */
export function getHeaders(
  headers: Record<string, string | string[] | undefined>,
  names: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const name of names) {
    result[name] = getHeader(headers, name)
  }
  return result
}

/**
 * 檢查是否存在指定 header
 */
export function hasHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): boolean {
  return getHeader(headers, name) !== undefined
}
```

### Task 1.2: 建立 Provider 抽象基礎類別

**檔案**: `src/providers/base/BaseProvider.ts`

```typescript
/**
 * Webhook Provider 抽象基礎類別
 * @module @gravito/echo/providers/base
 */

import type { WebhookProvider, WebhookVerificationResult } from '../../types'
import { getHeader, hasHeader } from './HeaderUtils'

export interface ProviderOptions {
  /** 時間戳容許誤差（秒），預設 300 */
  tolerance?: number
}

/**
 * 所有 Provider 的抽象基礎類別
 * 提供通用的 header 處理與錯誤格式化
 */
export abstract class BaseProvider implements WebhookProvider {
  abstract readonly name: string

  protected tolerance: number

  constructor(options: ProviderOptions = {}) {
    this.tolerance = options.tolerance ?? 300
  }

  /**
   * 驗證 webhook 請求
   * 子類別必須實作此方法
   */
  abstract verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * 解析事件類型（可選覆寫）
   */
  parseEventType?(payload: unknown): string | undefined

  // ─────────────────────────────────────────────
  // Protected 輔助方法
  // ─────────────────────────────────────────────

  /**
   * 取得 header 值
   */
  protected getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    return getHeader(headers, name)
  }

  /**
   * 檢查 header 是否存在
   */
  protected hasHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): boolean {
    return hasHeader(headers, name)
  }

  /**
   * 建立驗證失敗結果
   */
  protected createFailure(error: string): WebhookVerificationResult {
    return { valid: false, error }
  }

  /**
   * 建立驗證成功結果
   */
  protected createSuccess(
    payload: unknown,
    options: { eventType?: string; webhookId?: string } = {}
  ): WebhookVerificationResult {
    return {
      valid: true,
      payload,
      eventType: options.eventType,
      webhookId: options.webhookId,
    }
  }

  /**
   * 將 payload 轉換為字串
   */
  protected payloadToString(payload: string | Buffer): string {
    return typeof payload === 'string' ? payload : payload.toString('utf-8')
  }

  /**
   * 安全解析 JSON
   */
  protected safeParseJson(str: string): { success: true; data: unknown } | { success: false; error: string } {
    try {
      return { success: true, data: JSON.parse(str) }
    } catch {
      return { success: false, error: 'Failed to parse webhook payload' }
    }
  }
}
```

### Task 1.3: 重構現有 Provider

#### GenericProvider 重構

```typescript
import { BaseProvider, type ProviderOptions } from './base/BaseProvider'
import { computeHmacSha256, timingSafeEqual, validateTimestamp } from '../receive/SignatureValidator'
import type { WebhookVerificationResult } from '../types'

interface GenericProviderOptions extends ProviderOptions {
  signatureHeader?: string
  timestampHeader?: string
}

export class GenericProvider extends BaseProvider {
  readonly name = 'generic'

  private signatureHeader: string
  private timestampHeader: string

  constructor(options: GenericProviderOptions = {}) {
    super(options)
    this.signatureHeader = options.signatureHeader ?? 'x-webhook-signature'
    this.timestampHeader = options.timestampHeader ?? 'x-webhook-timestamp'
  }

  async verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult> {
    // 取得簽章
    const signature = this.getHeader(headers, this.signatureHeader)
    if (!signature) {
      return this.createFailure(`Missing signature header: ${this.signatureHeader}`)
    }

    // 驗證時間戳（如果存在）
    const timestampStr = this.getHeader(headers, this.timestampHeader)
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10)
      if (Number.isNaN(timestamp) || !validateTimestamp(timestamp, this.tolerance)) {
        return this.createFailure('Timestamp validation failed')
      }
    }

    // 計算並比較簽章
    const payloadStr = this.payloadToString(payload)
    const expectedSignature = await computeHmacSha256(payloadStr, secret)

    if (!timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase())) {
      return this.createFailure('Signature verification failed')
    }

    // 解析 payload
    const parseResult = this.safeParseJson(payloadStr)
    if (!parseResult.success) {
      return this.createSuccess(payloadStr)
    }

    const parsed = parseResult.data as Record<string, unknown>
    return this.createSuccess(parsed, {
      eventType: (parsed.type ?? parsed.event ?? parsed.eventType) as string | undefined,
      webhookId: (parsed.id ?? parsed.webhookId) as string | undefined,
    })
  }
}
```

#### 其他 Provider 類似重構

StripeProvider 和 GitHubProvider 採用相同模式，繼承 `BaseProvider` 並使用其輔助方法。

### Task 1.4: 匯出調整

**檔案**: `src/providers/index.ts`

```typescript
// 基礎類別（供擴展使用）
export { BaseProvider, type ProviderOptions } from './base/BaseProvider'
export { getHeader, getHeaders, hasHeader } from './base/HeaderUtils'

// 內建 Provider
export { GenericProvider } from './GenericProvider'
export { GitHubProvider } from './GitHubProvider'
export { StripeProvider } from './StripeProvider'
```

**檔案**: `src/index.ts` 新增匯出

```typescript
// 新增 BaseProvider 匯出供使用者擴展
export { BaseProvider, type ProviderOptions } from './providers/base/BaseProvider'
```

## 效益

### 1. 程式碼重用

- 消除 ~45 行重複代碼
- 統一 header 處理邏輯
- 共享錯誤處理模式

### 2. 擴展性

- 新增 Provider 只需繼承 `BaseProvider`
- 預設行為可輕鬆覆寫
- 減少樣板代碼

### 3. 維護性

- 單一真實來源的 header 處理
- 一致的錯誤訊息格式
- 更容易追蹤問題

### 4. 測試性

- BaseProvider 可獨立測試
- HeaderUtils 可單元測試
- 各 Provider 測試更專注於特定邏輯

## 遷移策略

### 向後相容

- 保持所有現有公開 API 不變
- `BaseProvider` 作為可選的擴展基礎
- 現有 Provider 行為完全一致

### 實施步驟

1. 建立 `base/` 目錄與新檔案
2. 實作 `HeaderUtils.ts`
3. 實作 `BaseProvider.ts`
4. 逐一重構現有 Provider
5. 更新匯出
6. 新增/更新測試

## 測試策略

### HeaderUtils 單元測試

```typescript
describe('HeaderUtils', () => {
  describe('getHeader', () => {
    it('should return header value with exact name match')
    it('should return header value with lowercase match')
    it('should return first value from array')
    it('should return undefined for missing header')
  })

  describe('hasHeader', () => {
    it('should return true when header exists')
    it('should return false when header missing')
  })
})
```

### BaseProvider 測試

```typescript
describe('BaseProvider', () => {
  describe('createFailure', () => {
    it('should return valid:false with error message')
  })

  describe('createSuccess', () => {
    it('should return valid:true with payload')
    it('should include eventType when provided')
    it('should include webhookId when provided')
  })

  describe('safeParseJson', () => {
    it('should parse valid JSON')
    it('should return error for invalid JSON')
  })
})
```

## 成功標準

- [ ] 所有重複的 `getHeader` 方法被移除
- [ ] 三個現有 Provider 都繼承 `BaseProvider`
- [ ] 新增 `HeaderUtils` 測試覆蓋率 100%
- [ ] 新增 `BaseProvider` 測試覆蓋率 95%+
- [ ] 所有現有測試通過
- [ ] 無破壞性變更

## 風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|---------|
| 破壞現有 API | 高 | 低 | 保持公開 API 完全不變 |
| 引入新 Bug | 中 | 低 | 完整的測試覆蓋 |
| 效能退化 | 低 | 極低 | 重構不影響核心邏輯 |

---

**下一階段**: [Phase 2: Provider 擴展](./PHASE-2-PROVIDERS.md)
