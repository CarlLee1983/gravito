# Phase 1: 核心功能完成

> 優先級: 🔴 關鍵
> 預計任務數: 4 個主要任務

## 概述

本階段專注於完成 support-chat-widget 的核心功能，包括 WebSocket 實時通信整合、API 整合、以及完善的類型定義系統。

## 1.1 WebSocket 實時通信整合

### 當前問題

```typescript
// 現有程式碼問題
export function SupportChatWidget({
  apiBaseUrl,
  wsUrl,  // ← 傳入但未使用
  context
}: ChatWidgetProps) {
  // ripple-client 未被使用
}
```

### 改進目標

- 整合 `@gravito/ripple-client` 建立 WebSocket 連線
- 實現訊息的實時收發
- 處理連線狀態和斷線重連

### 實作規格

#### 新增檔案: `src/hooks/useWebSocket.ts`

```typescript
import { useRippleClient, useRippleChannel } from '@gravito/ripple-client'

interface UseWebSocketOptions {
  wsUrl: string
  conversationId: string | null
  onMessage: (message: ChatMessage) => void
  onStatusChange: (status: ConnectionStatus) => void
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useWebSocket(options: UseWebSocketOptions) {
  // 實作內容:
  // 1. 使用 useRippleClient 建立連線
  // 2. 訂閱對應的會話頻道
  // 3. 監聽訊息事件
  // 4. 處理連線狀態變化
  // 5. 實現斷線重連邏輯
}
```

#### 連線邏輯

```
初始化流程:
1. 組件掛載
2. 若有 conversationId → 連接 WebSocket
3. 訂閱頻道: `support:conversation:${conversationId}`
4. 監聽 'message' 事件
5. 更新連線狀態

斷線重連:
1. 檢測連線斷開
2. 指數退避等待 (1s, 2s, 4s, 8s, max 30s)
3. 嘗試重新連線
4. 最多重試 5 次
5. 超過則顯示錯誤提示
```

### 驗收標準

- [ ] WebSocket 連線成功建立
- [ ] 能夠接收實時訊息
- [ ] 連線狀態正確顯示 (在線/離線)
- [ ] 斷線後自動重連
- [ ] 無記憶體洩漏 (正確清理訂閱)

---

## 1.2 API 整合

### 當前問題

```typescript
// 現有程式碼問題
apiBaseUrl  // ← 傳入但未使用

// 所有訊息都是本地狀態，無 API 調用
const [messages, setMessages] = useState<any[]>([])
```

### 改進目標

- 實現會話創建/恢復 API
- 實現訊息發送 API
- 實現歷史訊息載入 API

### 實作規格

#### 新增檔案: `src/api/supportApi.ts`

```typescript
interface SupportApi {
  createConversation(context?: ConversationContext): Promise<Conversation>
  getConversation(conversationId: string): Promise<Conversation | null>
  sendMessage(conversationId: string, content: string): Promise<ChatMessage>
  getMessages(conversationId: string, options?: PaginationOptions): Promise<MessagesResponse>
}

// 預期 API 端點
// POST /api/support/conversations        - 建立新會話
// GET  /api/support/conversations/:id    - 取得會話資訊
// POST /api/support/conversations/:id/messages - 發送訊息
// GET  /api/support/conversations/:id/messages - 取得訊息歷史
```

#### 新增檔案: `src/hooks/useMessages.ts`

```typescript
interface UseMessagesOptions {
  apiBaseUrl: string
  conversationId: string | null
}

interface UseMessagesReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: Error | null
  sendMessage: (content: string) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  // 實作內容:
  // 1. 管理訊息狀態
  // 2. 載入歷史訊息
  // 3. 發送新訊息
  // 4. 處理載入狀態和錯誤
  // 5. 支援分頁載入
}
```

### API 錯誤處理

```typescript
type ApiError = {
  code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'SERVER_ERROR'
  message: string
  retryable: boolean
}

// 錯誤處理策略
// NETWORK_ERROR → 顯示離線提示，本地暫存訊息
// AUTH_ERROR    → 重新初始化會話
// NOT_FOUND     → 建立新會話
// RATE_LIMITED  → 顯示提示，暫時禁用發送
// SERVER_ERROR  → 顯示錯誤，允許重試
```

### 驗收標準

- [ ] 會話能夠正確建立和恢復
- [ ] 訊息能夠發送到後端
- [ ] 歷史訊息能夠正確載入
- [ ] API 錯誤有適當處理
- [ ] 網路錯誤時訊息本地暫存

---

## 1.3 類型定義完善

### 當前問題

```typescript
// 現有程式碼問題
const [messages, setMessages] = useState<any[]>([])  // ← any 類型
```

### 改進目標

- 消除所有 `any` 類型
- 建立完整的類型定義系統
- 確保類型安全

### 實作規格

#### 新增檔案: `src/types/index.ts`

```typescript
// ==================== 基礎類型 ====================

export type MessageSender = 'CUSTOMER' | 'SUPPORT' | 'SYSTEM'

export type ConversationType = 'ORDER' | 'PRODUCT' | 'GENERAL'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed'

// ==================== 訊息相關 ====================

export interface ChatMessage {
  id: string
  conversationId: string
  sender: MessageSender
  content: string
  status: MessageStatus
  createdAt: Date
  metadata?: Record<string, unknown>
}

export interface SystemMessage extends Omit<ChatMessage, 'sender'> {
  sender: 'SYSTEM'
  type: 'WELCOME' | 'AGENT_JOINED' | 'AGENT_LEFT' | 'SESSION_ENDED'
}

// ==================== 會話相關 ====================

export interface ConversationContext {
  type: ConversationType
  id?: string
  title?: string
  metadata?: Record<string, unknown>
}

export interface Conversation {
  id: string
  customerId?: string
  context?: ConversationContext
  status: 'ACTIVE' | 'PENDING' | 'CLOSED'
  createdAt: Date
  updatedAt: Date
}

// ==================== API 相關 ====================

export interface PaginationOptions {
  limit?: number
  cursor?: string
  direction?: 'before' | 'after'
}

export interface MessagesResponse {
  messages: ChatMessage[]
  hasMore: boolean
  nextCursor?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// ==================== 組件 Props ====================

export interface ChatWidgetProps {
  /** Gravito Support API 基礎 URL */
  apiBaseUrl: string
  /** WebSocket 連線 URL */
  wsUrl: string
  /** 會話上下文 (可選) */
  context?: ConversationContext
  /** 自訂樣式類名 (可選) */
  className?: string
  /** 初始開啟狀態 (預設 false) */
  defaultOpen?: boolean
  /** 開關狀態變化回調 */
  onOpenChange?: (open: boolean) => void
  /** 連線狀態變化回調 */
  onConnectionChange?: (status: ConnectionStatus) => void
}
```

### 驗收標準

- [ ] 無任何 `any` 類型
- [ ] 所有 API 響應有對應類型
- [ ] 所有組件 Props 有完整定義
- [ ] TypeScript 編譯無錯誤
- [ ] IDE 有完整的類型提示

---

## 1.4 錯誤處理機制

### 當前問題

```typescript
// 現有程式碼問題
// 無任何 try-catch
// 無錯誤邊界
// 無連線狀態監控
```

### 改進目標

- 實現全面的錯誤處理
- 提供友善的錯誤提示
- 實現錯誤恢復機制

### 實作規格

#### 新增檔案: `src/components/ErrorBoundary.tsx`

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

// 捕獲渲染錯誤，顯示友善的錯誤訊息
```

#### 新增檔案: `src/hooks/useErrorHandler.ts`

```typescript
interface UseErrorHandlerReturn {
  error: Error | null
  handleError: (error: Error) => void
  clearError: () => void
  retry: () => void
}

// 統一的錯誤處理邏輯
```

### 錯誤處理策略

| 錯誤類型 | 處理方式 | 用戶提示 |
|---------|---------|---------|
| 網路錯誤 | 自動重試 3 次 | "連線中斷，正在重新連接..." |
| 發送失敗 | 本地暫存，重連後重發 | "訊息發送失敗，點擊重試" |
| 會話過期 | 自動建立新會話 | "會話已重新建立" |
| 伺服器錯誤 | 顯示錯誤，允許重試 | "系統暫時無法使用，請稍後再試" |
| 未知錯誤 | 記錄日誌，降級處理 | "發生未知錯誤" |

### 驗收標準

- [ ] 所有 API 調用有錯誤處理
- [ ] WebSocket 斷線有恢復機制
- [ ] 用戶能看到友善的錯誤提示
- [ ] 錯誤狀態可以清除和重試
- [ ] 嚴重錯誤有 ErrorBoundary 捕獲

---

## 檔案結構變更

完成 Phase 1 後的檔案結構:

```
src/
├── index.tsx                    # 主入口 (導出組件)
├── types/
│   └── index.ts                 # 類型定義
├── api/
│   └── supportApi.ts            # API 調用封裝
├── hooks/
│   ├── useWebSocket.ts          # WebSocket 連線 Hook
│   ├── useMessages.ts           # 訊息管理 Hook
│   └── useErrorHandler.ts       # 錯誤處理 Hook
├── components/
│   ├── ChatWidget.tsx           # 主組件
│   └── ErrorBoundary.tsx        # 錯誤邊界
└── utils/
    └── storage.ts               # localStorage 封裝
```

---

## 依賴變更

無需新增依賴，使用現有的:

- `@gravito/ripple-client` - WebSocket 連線
- `react` - 狀態管理和 Hooks

---

## 相關文檔

- [返回主計劃](../IMPROVEMENT_PLAN.md)
- [Phase 2: 程式碼品質提升](./PHASE_2_CODE_QUALITY.md)

---

**文檔版本**: 1.0.0
**建立日期**: 2026-01-26
