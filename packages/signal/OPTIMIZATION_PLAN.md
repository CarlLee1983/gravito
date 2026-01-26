# @gravito/signal 優化改進計劃

## 目前架構概覽

`@gravito/signal` 是 Gravito 框架的郵件服務模組，提供以下核心功能：

- **多傳輸層支援**：SMTP、AWS SES、Log、Memory
- **多渲染引擎**：HTML、Template (Prism)、React、Vue
- **開發模式**：內建郵件攔截與預覽 UI (`/__mail`)
- **佇列整合**：透過 `@gravito/stream` 支援非同步發送
- **國際化支援**：內建翻譯函式整合

---

## 第一階段：程式碼重構與 JSDoc 增強

### 1.1 JSDoc 文檔優化

**目標**：增強 AI 可讀性與開發者體驗

| 檔案 | 優先級 | 改進內容 |
|------|--------|----------|
| `types.ts` | 高 | 補充 `@example`、`@see` 關聯說明 |
| `Mailable.ts` | 高 | 增加完整使用範例、方法間的關聯說明 |
| `OrbitSignal.ts` | 高 | 補充配置說明、錯誤處理說明 |
| `transports/*.ts` | 中 | 增加配置範例、錯誤碼說明 |
| `renderers/*.ts` | 中 | 補充渲染流程說明 |

**具體改進項目**：

```typescript
// 範例：增強 Mailable 的 JSDoc
/**
 * Base class for all mailable messages.
 *
 * @description
 * Mailable 提供流式 API 來建構郵件信封並使用多種引擎渲染內容。
 * 支援 HTML、Prism 模板、React 與 Vue 組件渲染。
 *
 * @architecture
 * ```
 * Mailable
 *   ├── Envelope (from, to, subject, etc.)
 *   ├── Renderer (HtmlRenderer | TemplateRenderer | ReactRenderer | VueRenderer)
 *   └── Queueable (佇列支援介面)
 * ```
 *
 * @lifecycle
 * 1. 建立 Mailable 子類別
 * 2. 實作 build() 方法設定信封與內容
 * 3. 呼叫 send() 或 queue() 發送
 *
 * @see {@link OrbitSignal} 郵件服務主類別
 * @see {@link Renderer} 內容渲染器介面
 * @see {@link Queueable} 佇列介面
 */
```

### 1.2 stripHtml 方法重複問題

**現狀**：`HtmlRenderer` 與 `TemplateRenderer` 各自實作相同的 `stripHtml` 方法

**改進方案**：

```typescript
// 新增 src/utils/html.ts
/**
 * HTML 工具函式集合
 *
 * @module utils/html
 * @since 3.1.0
 */

/**
 * 將 HTML 內容轉換為純文字。
 *
 * @description
 * 移除所有 HTML 標籤、樣式、腳本，並正規化空白字元。
 * 用於產生郵件的純文字版本。
 *
 * @param html - 原始 HTML 字串
 * @returns 純文字內容
 *
 * @example
 * ```typescript
 * const text = stripHtml('<h1>Hello</h1><p>World</p>')
 * // Returns: 'Hello World'
 * ```
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, '')
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
```

---

## 第二階段：功能增強

### 2.1 傳輸層錯誤處理增強

**現狀**：傳輸層錯誤直接拋出，缺乏統一的錯誤類型

**改進方案**：

```typescript
// 新增 src/errors.ts
/**
 * 郵件傳輸相關的錯誤類別
 *
 * @since 3.1.0
 */
export class MailTransportError extends Error {
  constructor(
    message: string,
    public readonly code: MailErrorCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'MailTransportError'
  }
}

export enum MailErrorCode {
  /** 連線失敗 */
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  /** 認證失敗 */
  AUTH_FAILED = 'AUTH_FAILED',
  /** 收件人被拒 */
  RECIPIENT_REJECTED = 'RECIPIENT_REJECTED',
  /** 訊息被拒 */
  MESSAGE_REJECTED = 'MESSAGE_REJECTED',
  /** 速率限制 */
  RATE_LIMIT = 'RATE_LIMIT',
  /** 未知錯誤 */
  UNKNOWN = 'UNKNOWN',
}
```

### 2.2 重試機制

**目標**：為傳輸層增加可配置的重試機制

```typescript
// Transport 介面擴展
export interface TransportOptions {
  /** 最大重試次數，預設 3 */
  maxRetries?: number
  /** 重試延遲（毫秒），預設 1000 */
  retryDelay?: number
  /** 指數退避乘數，預設 2 */
  backoffMultiplier?: number
}

// 新增 BaseTransport 抽象類別
export abstract class BaseTransport implements Transport {
  protected options: Required<TransportOptions>

  constructor(options?: TransportOptions) {
    this.options = {
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      backoffMultiplier: options?.backoffMultiplier ?? 2,
    }
  }

  async send(message: Message): Promise<void> {
    let lastError: Error | undefined
    let delay = this.options.retryDelay

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.doSend(message)
      } catch (error) {
        lastError = error as Error
        if (attempt < this.options.maxRetries) {
          await this.sleep(delay)
          delay *= this.options.backoffMultiplier
        }
      }
    }

    throw new MailTransportError(
      `發送失敗，已重試 ${this.options.maxRetries} 次`,
      MailErrorCode.UNKNOWN,
      lastError
    )
  }

  protected abstract doSend(message: Message): Promise<void>

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
```

### 2.3 事件鉤子系統

**目標**：提供郵件生命週期事件鉤子

```typescript
// 新增 src/events.ts
export type MailEventType =
  | 'beforeSend'
  | 'afterSend'
  | 'sendFailed'
  | 'beforeRender'
  | 'afterRender'

export interface MailEvent {
  type: MailEventType
  mailable: Mailable
  message?: Message
  error?: Error
  timestamp: Date
}

export type MailEventHandler = (event: MailEvent) => void | Promise<void>

// OrbitSignal 擴展
export class OrbitSignal implements GravitoOrbit {
  private eventHandlers = new Map<MailEventType, MailEventHandler[]>()

  /**
   * 註冊事件處理器
   *
   * @example
   * ```typescript
   * mail.on('afterSend', async (event) => {
   *   await analytics.track('email_sent', {
   *     to: event.message?.to,
   *     subject: event.message?.subject
   *   })
   * })
   * ```
   */
  on(event: MailEventType, handler: MailEventHandler): this {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
    return this
  }

  private async emit(event: MailEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }
}
```

---

## 第三階段：效能優化

### 3.1 渲染器快取

**目標**：快取已編譯的模板以提升效能

```typescript
// TemplateRenderer 增強
export class TemplateRenderer implements Renderer {
  private static engineCache = new Map<string, TemplateEngine>()

  private getEngine(): TemplateEngine {
    const cached = TemplateRenderer.engineCache.get(this.viewsDir)
    if (cached) return cached

    const engine = new TemplateEngine(this.viewsDir)
    TemplateRenderer.engineCache.set(this.viewsDir, engine)
    return engine
  }

  /**
   * 清除模板引擎快取
   *
   * @description
   * 在開發模式下，當模板檔案變更時呼叫此方法。
   */
  static clearCache(): void {
    TemplateRenderer.engineCache.clear()
  }
}
```

### 3.2 連線池管理

**目標**：為 SMTP 傳輸實作連線池

```typescript
// SmtpTransport 增強
export interface SmtpConfig {
  // ... 現有配置
  /** 連線池大小，預設 5 */
  poolSize?: number
  /** 連線最大閒置時間（毫秒），預設 30000 */
  maxIdleTime?: number
}

export class SmtpTransport implements Transport {
  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      ...config,
      pool: true,
      maxConnections: config.poolSize ?? 5,
      maxMessages: Infinity,
      rateDelta: 1000,
      rateLimit: 10,
    })
  }

  /**
   * 關閉連線池
   *
   * @description
   * 在應用程式關閉時呼叫以釋放資源。
   */
  async close(): Promise<void> {
    this.transporter.close()
  }

  /**
   * 驗證 SMTP 連線
   *
   * @returns 連線是否成功
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch {
      return false
    }
  }
}
```

---

## 第四階段：開發者體驗增強

### 4.1 Dev UI 功能增強

**目標**：增強開發郵件預覽 UI 的功能

- [ ] 郵件搜尋功能
- [ ] 標籤/分類過濾
- [ ] 響應式預覽（桌面/平板/手機）
- [ ] 郵件匯出功能（EML 格式）
- [ ] 批次刪除功能
- [ ] WebSocket 即時更新

### 4.2 CLI 工具

**目標**：提供郵件相關的 CLI 命令

```bash
# 發送測試郵件
bun gravito mail:test --to test@example.com

# 預覽 Mailable
bun gravito mail:preview WelcomeEmail --data '{"name": "John"}'

# 清空開發郵箱
bun gravito mail:clear
```

### 4.3 型別安全增強

**目標**：提升 TypeScript 型別推斷

```typescript
// 強型別 Mailable
export abstract class TypedMailable<TData extends Record<string, unknown>> extends Mailable {
  protected abstract data: TData

  view<K extends keyof TData>(template: string, data: TData): this {
    // 編譯時型別檢查
    return super.view(template, data)
  }
}

// 使用範例
interface WelcomeData {
  name: string
  email: string
  activationUrl: string
}

class WelcomeEmail extends TypedMailable<WelcomeData> {
  protected data: WelcomeData

  constructor(data: WelcomeData) {
    super()
    this.data = data
  }

  build() {
    return this
      .to(this.data.email)
      .subject('歡迎加入！')
      .view('welcome', this.data) // 型別安全
  }
}
```

---

## 第五階段：測試與品質保證

### 5.1 測試覆蓋率目標

| 模組 | 目前覆蓋率 | 目標覆蓋率 |
|------|-----------|-----------|
| OrbitSignal | ~75% | 90% |
| Mailable | ~70% | 90% |
| Transports | ~60% | 85% |
| Renderers | ~65% | 85% |
| DevServer | ~50% | 80% |

### 5.2 新增測試案例

- [ ] 傳輸層重試機制測試
- [ ] 事件鉤子系統測試
- [ ] 連線池管理測試
- [ ] 渲染器快取測試
- [ ] 錯誤處理邊界情況測試
- [ ] 國際化功能測試
- [ ] 佇列整合測試

### 5.3 效能基準測試

```typescript
// benchmarks/mail-sending.bench.ts
import { bench, describe } from 'vitest'

describe('Mail Sending Performance', () => {
  bench('SmtpTransport - single message', async () => {
    await transport.send(testMessage)
  })

  bench('SmtpTransport - 100 messages concurrent', async () => {
    await Promise.all(
      Array.from({ length: 100 }, () => transport.send(testMessage))
    )
  })

  bench('TemplateRenderer - with cache', async () => {
    await renderer.render(testData)
  })
})
```

---

## 實施時程建議

| 階段 | 內容 | 優先級 |
|------|------|--------|
| 第一階段 | JSDoc 增強、程式碼重構 | 高 |
| 第二階段 | 錯誤處理、重試機制、事件系統 | 高 |
| 第三階段 | 效能優化（快取、連線池） | 中 |
| 第四階段 | 開發者體驗（Dev UI、CLI） | 中 |
| 第五階段 | 測試與品質保證 | 高 |

---

## 破壞性變更注意事項

以下改進可能導致破壞性變更，需要在下一個主版本（4.0）中實施：

1. **Transport 介面變更**：增加 `close()` 方法
2. **錯誤類型變更**：使用自定義錯誤類別
3. **配置選項變更**：傳輸層配置擴展

建議在 3.x 版本中以可選方式引入新功能，在 4.0 版本中設為預設行為。

---

## 參考資源

- [Nodemailer 文檔](https://nodemailer.com/)
- [AWS SES 最佳實踐](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [郵件傳送最佳實踐](https://postmarkapp.com/guides/best-practices-for-email-delivery)
