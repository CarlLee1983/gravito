# Phase 4: 文檔完善

> 優先級: 🟢 低
> 預計任務數: 3 個主要任務
> 前置條件: Phase 3 完成

## 概述

本階段專注於完善模組文檔，包括 README 更新、JSDoc 註解、以及完整的使用範例。

## 4.1 README 完善

### 當前問題

```markdown
<!-- 現有 README.md -->
# Support Chat Widget

客服聊天小工具
```

### 改進目標

- 完整的安裝和使用指南
- API 參考文檔
- 配置選項說明
- 常見問題解答

### README 結構

```markdown
# @gravito/support-chat-widget

輕量級、可自訂的客服聊天小工具，支援 WebSocket 實時通信。

## 功能特色

- 🚀 輕量級 - 打包後 < 30KB (gzipped)
- 💬 實時通信 - 基於 WebSocket 的即時訊息
- 🔒 安全 - XSS 防護、輸入驗證
- 📱 響應式 - 支援桌面和行動裝置
- 🎨 可自訂 - 豐富的樣式配置選項
- 🔌 離線支援 - 離線時訊息自動暫存

## 安裝

### npm
npm install @gravito/support-chat-widget

### pnpm
pnpm add @gravito/support-chat-widget

### yarn
yarn add @gravito/support-chat-widget

## 快速開始

### 基本使用
import { SupportChatWidget } from '@gravito/support-chat-widget'

function App() {
  return (
    <SupportChatWidget
      apiBaseUrl="https://api.example.com"
      wsUrl="wss://ws.example.com"
    />
  )
}

### 帶上下文
<SupportChatWidget
  apiBaseUrl="https://api.example.com"
  wsUrl="wss://ws.example.com"
  context={{
    type: 'ORDER',
    id: 'ORD-12345',
    title: '訂單 #12345 問題諮詢'
  }}
/>

## API 參考

### Props

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| apiBaseUrl | string | ✅ | - | Gravito Support API 基礎 URL |
| wsUrl | string | ✅ | - | WebSocket 連線 URL |
| context | ConversationContext | ❌ | - | 會話上下文 |
| className | string | ❌ | - | 自訂樣式類名 |
| defaultOpen | boolean | ❌ | false | 初始開啟狀態 |
| onOpenChange | function | ❌ | - | 開關狀態變化回調 |
| onConnectionChange | function | ❌ | - | 連線狀態變化回調 |

### ConversationContext

| 屬性 | 類型 | 說明 |
|------|------|------|
| type | 'ORDER' \| 'PRODUCT' \| 'GENERAL' | 上下文類型 |
| id | string | 關聯 ID (訂單號、產品 ID 等) |
| title | string | 顯示標題 |
| metadata | object | 額外資訊 |

### 回調函數

#### onOpenChange
(open: boolean) => void

#### onConnectionChange
(status: 'connecting' | 'connected' | 'disconnected' | 'error') => void

## 進階配置

### 自訂樣式

<SupportChatWidget
  apiBaseUrl="..."
  wsUrl="..."
  className="my-custom-chat"
/>

.my-custom-chat {
  --chat-primary-color: #6366f1;
  --chat-width: 400px;
  --chat-height: 600px;
}

### 程式化控制

import { useSupportChat } from '@gravito/support-chat-widget'

function MyComponent() {
  const { open, close, sendMessage } = useSupportChat()

  return (
    <button onClick={open}>開啟客服</button>
  )
}

## 瀏覽器支援

| 瀏覽器 | 版本 |
|--------|------|
| Chrome | ≥ 80 |
| Firefox | ≥ 78 |
| Safari | ≥ 14 |
| Edge | ≥ 80 |

## 常見問題

### Q: 如何處理連線中斷？
A: 組件內建自動重連機制，最多重試 5 次。

### Q: 離線時發送的訊息會丟失嗎？
A: 不會，離線訊息會暫存到本地，恢復連線後自動發送。

### Q: 如何自訂歡迎訊息？
A: 目前透過後端 API 配置，前端組件會自動顯示。

## 更新日誌

詳見 [CHANGELOG.md](./CHANGELOG.md)

## 授權

MIT
```

### 驗收標準

- [ ] 包含安裝指南
- [ ] 包含基本使用範例
- [ ] 包含完整 API 參考
- [ ] 包含進階配置說明
- [ ] 包含常見問題解答

---

## 4.2 JSDoc 註解

### 改進目標

- 所有公開 API 有 JSDoc 註解
- IDE 有完整的智能提示
- 可自動生成 API 文檔

### 註解規範

#### 組件註解

```typescript
/**
 * 客服聊天小工具組件
 *
 * 提供即時的客服對話功能，支援 WebSocket 實時通信。
 *
 * @example
 * ```tsx
 * <SupportChatWidget
 *   apiBaseUrl="https://api.example.com"
 *   wsUrl="wss://ws.example.com"
 *   context={{ type: 'ORDER', id: 'ORD-123' }}
 * />
 * ```
 *
 * @see {@link ChatWidgetProps} 完整的 Props 定義
 * @see {@link useConversation} 會話管理 Hook
 */
export function SupportChatWidget(props: ChatWidgetProps): JSX.Element
```

#### Props 註解

```typescript
/**
 * 聊天小工具的配置選項
 */
export interface ChatWidgetProps {
  /**
   * Gravito Support API 的基礎 URL
   *
   * @example "https://api.gravito.io"
   */
  apiBaseUrl: string

  /**
   * WebSocket 連線 URL
   *
   * @example "wss://ws.gravito.io"
   */
  wsUrl: string

  /**
   * 會話上下文資訊
   *
   * 用於關聯訂單、產品等業務實體
   *
   * @example
   * ```ts
   * context: {
   *   type: 'ORDER',
   *   id: 'ORD-12345',
   *   title: '訂單問題諮詢'
   * }
   * ```
   */
  context?: ConversationContext

  /**
   * 自訂 CSS 類名
   *
   * 用於覆寫預設樣式
   */
  className?: string

  /**
   * 初始開啟狀態
   *
   * @default false
   */
  defaultOpen?: boolean

  /**
   * 開關狀態變化時的回調函數
   *
   * @param open - 新的開啟狀態
   */
  onOpenChange?: (open: boolean) => void

  /**
   * WebSocket 連線狀態變化時的回調函數
   *
   * @param status - 新的連線狀態
   */
  onConnectionChange?: (status: ConnectionStatus) => void
}
```

#### Hook 註解

```typescript
/**
 * 管理聊天會話的 Hook
 *
 * 處理會話的建立、恢復和銷毀。
 *
 * @param options - 配置選項
 * @returns 會話狀態和操作方法
 *
 * @example
 * ```tsx
 * const { conversation, createConversation } = useConversation({
 *   apiBaseUrl: 'https://api.example.com',
 *   context: { type: 'GENERAL' }
 * })
 *
 * if (!conversation) {
 *   await createConversation()
 * }
 * ```
 *
 * @see {@link UseConversationOptions} 配置選項
 * @see {@link Conversation} 會話資料結構
 */
export function useConversation(options: UseConversationOptions): UseConversationReturn
```

#### 函數註解

```typescript
/**
 * 驗證訊息內容是否有效
 *
 * 檢查訊息是否為空、是否超過長度限制，並進行 XSS 清理。
 *
 * @param content - 要驗證的訊息內容
 * @returns 驗證結果，包含成功標誌和可能的錯誤訊息
 *
 * @example
 * ```ts
 * const result = validateMessageContent('Hello!')
 * if (result.success) {
 *   sendMessage(result.data)
 * } else {
 *   showError(result.error)
 * }
 * ```
 *
 * @throws 不會拋出異常，所有錯誤都通過返回值傳遞
 */
export function validateMessageContent(content: string): ValidationResult
```

### 驗收標準

- [ ] 所有公開組件有 JSDoc
- [ ] 所有公開 Hook 有 JSDoc
- [ ] 所有公開類型有 JSDoc
- [ ] 所有公開函數有 JSDoc
- [ ] JSDoc 包含使用範例

---

## 4.3 使用範例

### 改進目標

- 提供完整的使用範例
- 涵蓋常見使用場景
- 可直接複製使用

### 範例結構

```
examples/
├── basic/
│   ├── App.tsx
│   └── README.md
├── with-context/
│   ├── App.tsx
│   └── README.md
├── custom-style/
│   ├── App.tsx
│   ├── styles.css
│   └── README.md
├── programmatic-control/
│   ├── App.tsx
│   └── README.md
└── with-auth/
    ├── App.tsx
    └── README.md
```

### 範例: 基本使用

```typescript
// examples/basic/App.tsx

import { SupportChatWidget } from '@gravito/support-chat-widget'

export default function App() {
  return (
    <div className="app">
      <h1>My Application</h1>
      <p>Welcome to my app!</p>

      {/* 聊天小工具會固定在右下角 */}
      <SupportChatWidget
        apiBaseUrl={import.meta.env.VITE_API_URL}
        wsUrl={import.meta.env.VITE_WS_URL}
      />
    </div>
  )
}
```

### 範例: 訂單頁面整合

```typescript
// examples/with-context/App.tsx

import { SupportChatWidget } from '@gravito/support-chat-widget'
import { useParams } from 'react-router-dom'

interface Order {
  id: string
  orderNumber: string
  status: string
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const order = useOrder(orderId)  // 假設的 Hook

  if (!order) return <Loading />

  return (
    <div className="order-detail">
      <h1>訂單 #{order.orderNumber}</h1>
      <p>狀態: {order.status}</p>

      {/* 帶訂單上下文的聊天小工具 */}
      <SupportChatWidget
        apiBaseUrl={import.meta.env.VITE_API_URL}
        wsUrl={import.meta.env.VITE_WS_URL}
        context={{
          type: 'ORDER',
          id: order.id,
          title: `訂單 #${order.orderNumber} 諮詢`
        }}
      />
    </div>
  )
}
```

### 範例: 自訂樣式

```typescript
// examples/custom-style/App.tsx

import { SupportChatWidget } from '@gravito/support-chat-widget'
import './styles.css'

export default function App() {
  return (
    <div className="app dark-theme">
      <SupportChatWidget
        apiBaseUrl="..."
        wsUrl="..."
        className="my-brand-chat"
      />
    </div>
  )
}
```

```css
/* examples/custom-style/styles.css */

.my-brand-chat {
  /* 自訂主色調 */
  --chat-primary: #8b5cf6;
  --chat-primary-hover: #7c3aed;

  /* 自訂尺寸 */
  --chat-width: 420px;
  --chat-height: 600px;

  /* 自訂圓角 */
  --chat-radius: 16px;

  /* 自訂陰影 */
  --chat-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}

/* 深色模式 */
.dark-theme .my-brand-chat {
  --chat-bg: #1f2937;
  --chat-text: #f9fafb;
  --chat-border: #374151;
}
```

### 範例: 程式化控制

```typescript
// examples/programmatic-control/App.tsx

import { SupportChatWidget, useSupportChat } from '@gravito/support-chat-widget'

function HelpButton() {
  const { open, isOpen } = useSupportChat()

  return (
    <button
      onClick={open}
      disabled={isOpen}
      className="help-button"
    >
      需要幫助？
    </button>
  )
}

export default function App() {
  return (
    <SupportChatWidget apiBaseUrl="..." wsUrl="...">
      <div className="app">
        <header>
          <h1>My App</h1>
          <HelpButton />
        </header>

        <main>
          <p>Content here...</p>
        </main>
      </div>
    </SupportChatWidget>
  )
}
```

### 範例: 帶認證

```typescript
// examples/with-auth/App.tsx

import { SupportChatWidget } from '@gravito/support-chat-widget'
import { useAuth } from './auth'

export default function App() {
  const { user, token } = useAuth()

  return (
    <div className="app">
      <SupportChatWidget
        apiBaseUrl="..."
        wsUrl="..."
        // 傳遞用戶資訊到上下文
        context={{
          type: 'GENERAL',
          metadata: {
            userId: user?.id,
            userEmail: user?.email,
            userPlan: user?.subscriptionPlan
          }
        }}
        // 認證 token 會透過 API 層處理
      />
    </div>
  )
}
```

### 驗收標準

- [ ] 至少 5 個使用範例
- [ ] 每個範例有說明文檔
- [ ] 範例可直接運行
- [ ] 覆蓋常見使用場景
- [ ] 程式碼有適當註解

---

## 4.4 CHANGELOG

### 變更日誌格式

```markdown
# Changelog

本專案的所有重要變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added
- 待發布的新功能

## [1.0.0] - 2026-XX-XX

### Added
- WebSocket 實時通信支援
- API 整合 (會話管理、訊息同步)
- 完整的 TypeScript 類型定義
- 錯誤處理和重連機制
- 會話持久化
- 離線訊息支援
- 虛擬滾動優化
- 80%+ 測試覆蓋率

### Changed
- 組件架構重構
- 效能優化

### Fixed
- N/A (首個正式版本)

## [0.1.0] - 2026-01-XX (當前版本)

### Added
- 基本 UI 實現
- 本地狀態管理
- 基礎樣式

### Known Issues
- WebSocket 未實現
- API 未整合
- 訊息不持久化
```

---

## 檔案結構變更

完成 Phase 4 後的完整結構:

```
support-chat-widget/
├── src/
│   ├── index.tsx
│   ├── types/
│   ├── api/
│   ├── hooks/
│   ├── components/
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── examples/
│   ├── basic/
│   ├── with-context/
│   ├── custom-style/
│   ├── programmatic-control/
│   └── with-auth/
├── docs/
│   ├── PHASE_1_CORE_FUNCTIONALITY.md
│   ├── PHASE_2_CODE_QUALITY.md
│   ├── PHASE_3_OPTIMIZATION.md
│   └── PHASE_4_DOCUMENTATION.md
├── dist/
├── node_modules/
├── package.json
├── tsconfig.json
├── README.md
├── README.zh-TW.md              # 新增: 繁體中文 README
├── CHANGELOG.md                  # 新增: 變更日誌
├── IMPROVEMENT_PLAN.md
└── LICENSE
```

---

## 相關文檔

- [返回主計劃](../IMPROVEMENT_PLAN.md)
- [Phase 1: 核心功能完成](./PHASE_1_CORE_FUNCTIONALITY.md)
- [Phase 2: 程式碼品質提升](./PHASE_2_CODE_QUALITY.md)
- [Phase 3: 效能優化與測試](./PHASE_3_OPTIMIZATION.md)

---

**文檔版本**: 1.0.0
**建立日期**: 2026-01-26
