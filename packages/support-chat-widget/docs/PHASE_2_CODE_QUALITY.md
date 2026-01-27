# Phase 2: 程式碼品質提升

> 優先級: 🟠 高
> 預計任務數: 4 個主要任務
> 前置條件: Phase 1 完成

## 概述

本階段專注於提升程式碼品質，包括組件拆分、Hook 抽取、安全性強化、以及會話持久化機制。

## 2.1 組件拆分

### 當前問題

```typescript
// 現有程式碼問題
// 所有邏輯集中在單一檔案 index.tsx (233 行)
// UI、狀態、邏輯混雜
```

### 改進目標

- 遵循單一職責原則
- 提高可維護性和可測試性
- 便於團隊協作

### 實作規格

#### 組件拆分計劃

```
src/components/
├── ChatWidget.tsx           # 主容器組件 (狀態管理)
├── ChatHeader.tsx           # 聊天視窗標題列
├── ChatMessages.tsx         # 訊息列表區域
├── ChatMessage.tsx          # 單一訊息氣泡
├── ChatInput.tsx            # 輸入區域
├── ChatTrigger.tsx          # 觸發按鈕 (浮動圓形按鈕)
├── ContextBanner.tsx        # 上下文橫幅
├── ConnectionStatus.tsx     # 連線狀態指示
└── TypingIndicator.tsx      # 客服輸入中指示
```

#### 組件介面定義

```typescript
// ChatHeader.tsx
interface ChatHeaderProps {
  onClose: () => void
  connectionStatus: ConnectionStatus
  agentName?: string
  agentAvatar?: string
}

// ChatMessages.tsx
interface ChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
  onLoadMore?: () => void
  hasMore: boolean
}

// ChatMessage.tsx
interface ChatMessageProps {
  message: ChatMessage
  onRetry?: () => void
}

// ChatInput.tsx
interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

// ChatTrigger.tsx
interface ChatTriggerProps {
  onClick: () => void
  hasUnread: boolean
  isOpen: boolean
}

// ContextBanner.tsx
interface ContextBannerProps {
  context: ConversationContext
  onDismiss?: () => void
}

// ConnectionStatus.tsx
interface ConnectionStatusProps {
  status: ConnectionStatus
  onRetry?: () => void
}

// TypingIndicator.tsx
interface TypingIndicatorProps {
  isTyping: boolean
  agentName?: string
}
```

### 驗收標準

- [ ] 每個組件職責單一
- [ ] 組件之間低耦合
- [ ] 每個組件可獨立測試
- [ ] Props 有完整的 TypeScript 定義
- [ ] 組件程式碼行數 < 100 行

---

## 2.2 Custom Hooks 抽取

### 當前問題

```typescript
// 現有程式碼問題
// 狀態邏輯散落在組件內
// 難以複用和測試
```

### 改進目標

- 分離 UI 和業務邏輯
- 提高邏輯複用性
- 便於單元測試

### 實作規格

#### Hooks 設計

```
src/hooks/
├── useWebSocket.ts          # WebSocket 連線管理 (Phase 1 已定義)
├── useMessages.ts           # 訊息狀態管理 (Phase 1 已定義)
├── useErrorHandler.ts       # 錯誤處理 (Phase 1 已定義)
├── useConversation.ts       # 會話管理 (新增)
├── useChatWidget.ts         # 整合 Hook (新增)
├── useTypingStatus.ts       # 輸入狀態管理 (新增)
└── useAutoScroll.ts         # 自動滾動 (新增)
```

#### useConversation.ts

```typescript
interface UseConversationOptions {
  apiBaseUrl: string
  context?: ConversationContext
  storageKey?: string
}

interface UseConversationReturn {
  conversation: Conversation | null
  conversationId: string | null
  isInitializing: boolean
  error: Error | null
  createConversation: () => Promise<void>
  endConversation: () => Promise<void>
}

export function useConversation(options: UseConversationOptions): UseConversationReturn {
  // 實作內容:
  // 1. 從 localStorage 恢復會話 ID
  // 2. 驗證會話是否有效
  // 3. 建立新會話
  // 4. 結束會話
}
```

#### useChatWidget.ts

```typescript
interface UseChatWidgetOptions extends ChatWidgetProps {
  // 繼承所有 ChatWidgetProps
}

interface UseChatWidgetReturn {
  // 狀態
  isOpen: boolean
  messages: ChatMessage[]
  connectionStatus: ConnectionStatus
  isLoading: boolean
  error: Error | null
  conversation: Conversation | null
  isTyping: boolean

  // 操作
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (content: string) => Promise<void>
  retry: () => void
  clearError: () => void
}

export function useChatWidget(options: UseChatWidgetOptions): UseChatWidgetReturn {
  // 整合所有子 Hooks
  const { conversation, conversationId } = useConversation(options)
  const { connectionStatus } = useWebSocket({ ... })
  const { messages, sendMessage } = useMessages({ ... })
  const { error, handleError, clearError } = useErrorHandler()

  // 返回統一的介面
}
```

#### useTypingStatus.ts

```typescript
interface UseTypingStatusOptions {
  conversationId: string | null
  onTypingChange?: (isTyping: boolean) => void
}

interface UseTypingStatusReturn {
  isAgentTyping: boolean
  notifyTyping: () => void
}

export function useTypingStatus(options: UseTypingStatusOptions): UseTypingStatusReturn {
  // 實作內容:
  // 1. 監聽 WebSocket 的 typing 事件
  // 2. 發送用戶輸入中通知
  // 3. 防抖處理
}
```

#### useAutoScroll.ts

```typescript
interface UseAutoScrollOptions {
  dependency: any[]  // 觸發滾動的依賴
  behavior?: ScrollBehavior
  threshold?: number  // 距離底部多少 px 內自動滾動
}

interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>
  scrollToBottom: () => void
  isAtBottom: boolean
}

export function useAutoScroll(options: UseAutoScrollOptions): UseAutoScrollReturn {
  // 實作內容:
  // 1. 監聯依賴變化
  // 2. 判斷是否在底部
  // 3. 自動滾動到底部
}
```

### 驗收標準

- [ ] 每個 Hook 職責單一
- [ ] Hook 之間無循環依賴
- [ ] 每個 Hook 可獨立測試
- [ ] useChatWidget 提供統一介面
- [ ] 無 useEffect 依賴警告

---

## 2.3 安全性強化

### 當前問題

```typescript
// 現有程式碼問題
// 無 XSS 防護
// 無輸入驗證
// localStorage 直接存取
```

### 改進目標

- 防止 XSS 攻擊
- 驗證和清理用戶輸入
- 安全的本地存儲

### 實作規格

#### 輸入驗證

```typescript
// src/utils/validation.ts

import { z } from 'zod'

export const messageSchema = z.object({
  content: z
    .string()
    .min(1, '訊息不能為空')
    .max(2000, '訊息長度不能超過 2000 字')
    .transform(sanitizeHtml)  // XSS 防護
})

export const conversationIdSchema = z
  .string()
  .regex(/^SESS-[a-zA-Z0-9]{8,32}$/, '無效的會話 ID')

export function validateMessageContent(content: string): ValidationResult {
  // 使用 zod 驗證
}
```

#### XSS 防護

```typescript
// src/utils/sanitize.ts

// 使用 DOMPurify 或自訂清理函數
export function sanitizeHtml(input: string): string {
  // 移除 HTML 標籤
  // 轉義特殊字符
  // 防止腳本注入
}

// 在顯示訊息時使用
<span>{sanitizeHtml(message.content)}</span>
```

#### 安全存儲封裝

```typescript
// src/utils/storage.ts

const STORAGE_KEY_PREFIX = 'gravito_support_'

interface StorageOptions {
  encrypt?: boolean
  expiry?: number  // 過期時間 (毫秒)
}

export const secureStorage = {
  get<T>(key: string): T | null {
    // 1. 檢查是否過期
    // 2. 解密 (如果啟用)
    // 3. JSON 解析
    // 4. 類型驗證
  },

  set<T>(key: string, value: T, options?: StorageOptions): void {
    // 1. JSON 序列化
    // 2. 加密 (如果啟用)
    // 3. 設置過期時間
    // 4. 存儲
  },

  remove(key: string): void {
    // 移除存儲項
  },

  clear(): void {
    // 清除所有 gravito_support_ 前綴的項目
  }
}
```

#### 內容安全策略

```typescript
// 確保不執行任何動態代碼
// 確保不載入外部資源
// 確保不使用 innerHTML
```

### 驗收標準

- [ ] 所有用戶輸入經過驗證
- [ ] HTML 內容經過清理
- [ ] 無 innerHTML 或 dangerouslySetInnerHTML
- [ ] localStorage 有過期機制
- [ ] 敏感資料經過加密 (如需要)

---

## 2.4 會話持久化

### 當前問題

```typescript
// 現有程式碼問題
// 只保存會話 ID
// 不保存訊息歷史
// 刷新頁面後訊息丟失
```

### 改進目標

- 完整的會話狀態持久化
- 離線訊息支援
- 跨 Tab 同步

### 實作規格

#### 持久化策略

```typescript
// src/utils/persistence.ts

interface PersistedState {
  conversationId: string | null
  messages: ChatMessage[]  // 最近 N 條訊息
  pendingMessages: ChatMessage[]  // 待發送訊息
  lastSyncAt: number
  context?: ConversationContext
}

export const chatPersistence = {
  save(state: PersistedState): void {
    // 限制訊息數量 (最多 50 條)
    // 序列化並存儲
  },

  load(): PersistedState | null {
    // 載入並反序列化
    // 驗證資料完整性
  },

  syncPendingMessages(api: SupportApi): Promise<void> {
    // 重連後發送待發訊息
  }
}
```

#### 離線支援

```typescript
// src/hooks/useOfflineSupport.ts

interface UseOfflineSupportReturn {
  isOnline: boolean
  queueMessage: (content: string) => void
  pendingCount: number
  syncPending: () => Promise<void>
}

export function useOfflineSupport(): UseOfflineSupportReturn {
  // 實作內容:
  // 1. 監聽網路狀態
  // 2. 離線時將訊息加入佇列
  // 3. 上線後自動同步
}
```

#### 跨 Tab 同步

```typescript
// src/hooks/useCrossTabSync.ts

export function useCrossTabSync<T>(key: string, initialValue: T) {
  // 使用 BroadcastChannel API 或 localStorage 事件
  // 同步多個 Tab 的聊天狀態
}
```

### 驗收標準

- [ ] 刷新頁面後訊息保留
- [ ] 離線時訊息能夠暫存
- [ ] 上線後自動同步待發訊息
- [ ] 多 Tab 狀態同步
- [ ] 存儲空間有上限控制

---

## 檔案結構變更

完成 Phase 2 後的檔案結構:

```
src/
├── index.tsx                    # 主入口
├── types/
│   └── index.ts                 # 類型定義
├── api/
│   └── supportApi.ts            # API 調用
├── hooks/
│   ├── useWebSocket.ts
│   ├── useMessages.ts
│   ├── useErrorHandler.ts
│   ├── useConversation.ts       # 新增
│   ├── useChatWidget.ts         # 新增
│   ├── useTypingStatus.ts       # 新增
│   ├── useAutoScroll.ts         # 新增
│   ├── useOfflineSupport.ts     # 新增
│   └── useCrossTabSync.ts       # 新增
├── components/
│   ├── ChatWidget.tsx
│   ├── ChatHeader.tsx           # 新增
│   ├── ChatMessages.tsx         # 新增
│   ├── ChatMessage.tsx          # 新增
│   ├── ChatInput.tsx            # 新增
│   ├── ChatTrigger.tsx          # 新增
│   ├── ContextBanner.tsx        # 新增
│   ├── ConnectionStatus.tsx     # 新增
│   ├── TypingIndicator.tsx      # 新增
│   └── ErrorBoundary.tsx
└── utils/
    ├── storage.ts
    ├── validation.ts            # 新增
    ├── sanitize.ts              # 新增
    └── persistence.ts           # 新增
```

---

## 依賴變更

可能需要新增:

```json
{
  "dependencies": {
    "zod": "^3.23.0"  // 輸入驗證 (可選，視項目統一標準)
  }
}
```

---

## 相關文檔

- [返回主計劃](../IMPROVEMENT_PLAN.md)
- [Phase 1: 核心功能完成](./PHASE_1_CORE_FUNCTIONALITY.md)
- [Phase 3: 效能優化與測試](./PHASE_3_OPTIMIZATION.md)

---

**文檔版本**: 1.0.0
**建立日期**: 2026-01-26
