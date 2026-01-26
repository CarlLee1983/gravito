# Phase 3: 效能優化與測試

> 優先級: 🟡 中
> 預計任務數: 4 個主要任務
> 前置條件: Phase 2 完成

## 概述

本階段專注於效能優化和測試覆蓋，包括 React 記憶化優化、虛擬滾動實現、以及完整的測試套件。

## 3.1 React 記憶化優化

### 當前問題

```typescript
// 現有程式碼問題
// 無 React.memo 包裝
// 無 useMemo/useCallback 使用
// 訊息列表頻繁重新渲染
```

### 改進目標

- 減少不必要的重新渲染
- 優化組件渲染效能
- 降低記憶體使用

### 實作規格

#### 組件記憶化

```typescript
// ChatMessage.tsx
export const ChatMessage = React.memo(function ChatMessage({
  message,
  onRetry
}: ChatMessageProps) {
  // 組件實作
}, (prevProps, nextProps) => {
  // 自訂比較函數
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.status === nextProps.message.status
})

// ChatMessages.tsx
export const ChatMessages = React.memo(function ChatMessages({
  messages,
  isLoading,
  onLoadMore,
  hasMore
}: ChatMessagesProps) {
  // 組件實作
})

// ChatInput.tsx
export const ChatInput = React.memo(function ChatInput({
  onSend,
  disabled,
  placeholder,
  maxLength
}: ChatInputProps) {
  // 組件實作
})
```

#### useMemo 優化

```typescript
// useChatWidget.ts
export function useChatWidget(options: UseChatWidgetOptions) {
  // 記憶化訊息排序結果
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [messages])

  // 記憶化分組結果 (按日期)
  const groupedMessages = useMemo(() => {
    return groupMessagesByDate(sortedMessages)
  }, [sortedMessages])

  // ...
}
```

#### useCallback 優化

```typescript
// useChatWidget.ts
export function useChatWidget(options: UseChatWidgetOptions) {
  const handleSend = useCallback(async (content: string) => {
    // 發送邏輯
  }, [conversationId, api])

  const handleRetry = useCallback((messageId: string) => {
    // 重試邏輯
  }, [api])

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
    onOpenChange?.(!isOpen)
  }, [isOpen, onOpenChange])

  // ...
}
```

### 效能監控

```typescript
// src/utils/performance.ts

// 開發環境下的效能監控
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  if (process.env.NODE_ENV !== 'development') {
    return Component
  }

  return function TrackedComponent(props: P) {
    const renderCount = useRef(0)
    renderCount.current++

    console.log(`[Performance] ${componentName} rendered ${renderCount.current} times`)

    return <Component {...props} />
  }
}
```

### 驗收標準

- [ ] 所有子組件使用 React.memo
- [ ] 複雜計算使用 useMemo
- [ ] 回調函數使用 useCallback
- [ ] 開發環境有效能監控
- [ ] 無不必要的重新渲染

---

## 3.2 虛擬滾動實現

### 當前問題

```typescript
// 現有程式碼問題
// 所有訊息都渲染到 DOM
// 大量訊息時效能下降
// 記憶體佔用隨訊息增長
```

### 改進目標

- 只渲染可見區域的訊息
- 支援大量訊息 (10000+)
- 平滑滾動體驗

### 實作規格

#### 虛擬滾動 Hook

```typescript
// src/hooks/useVirtualScroll.ts

interface VirtualScrollOptions {
  itemCount: number
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  overscan?: number  // 預渲染的項目數
}

interface VirtualScrollReturn {
  virtualItems: VirtualItem[]
  totalHeight: number
  scrollToIndex: (index: number) => void
  containerProps: {
    onScroll: (e: React.UIEvent) => void
    style: React.CSSProperties
  }
}

interface VirtualItem {
  index: number
  start: number
  end: number
  size: number
}

export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollReturn {
  // 實作內容:
  // 1. 計算可見範圍
  // 2. 生成虛擬項目列表
  // 3. 處理滾動事件
  // 4. 支援動態高度
}
```

#### 虛擬列表組件

```typescript
// src/components/VirtualMessageList.tsx

interface VirtualMessageListProps {
  messages: ChatMessage[]
  onLoadMore?: () => void
  hasMore: boolean
  estimatedItemHeight?: number
}

export function VirtualMessageList({
  messages,
  onLoadMore,
  hasMore,
  estimatedItemHeight = 60
}: VirtualMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(400)

  // 使用 ResizeObserver 監聽容器大小變化
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height)
    })
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

  const { virtualItems, totalHeight, containerProps } = useVirtualScroll({
    itemCount: messages.length,
    itemHeight: estimatedItemHeight,
    containerHeight,
    overscan: 5
  })

  return (
    <div ref={containerRef} {...containerProps}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(item => (
          <div
            key={messages[item.index].id}
            style={{
              position: 'absolute',
              top: item.start,
              width: '100%'
            }}
          >
            <ChatMessage message={messages[item.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### 動態高度支援

```typescript
// 對於不定高度的訊息氣泡
interface DynamicHeightCache {
  [messageId: string]: number
}

export function useDynamicHeight(messages: ChatMessage[]) {
  const heightCache = useRef<DynamicHeightCache>({})

  const measureHeight = useCallback((messageId: string, element: HTMLElement) => {
    heightCache.current[messageId] = element.getBoundingClientRect().height
  }, [])

  const getHeight = useCallback((index: number) => {
    const messageId = messages[index].id
    return heightCache.current[messageId] || 60  // 預設高度
  }, [messages])

  return { measureHeight, getHeight }
}
```

### 驗收標準

- [ ] 只渲染可見區域訊息
- [ ] 10000 條訊息下仍流暢
- [ ] 滾動時無明顯卡頓
- [ ] 支援滾動到指定訊息
- [ ] 記憶體使用穩定

---

## 3.3 單元測試

### 當前問題

```
測試覆蓋率: 0%
無任何測試檔案
```

### 改進目標

- 達到 80%+ 測試覆蓋率
- 覆蓋所有核心邏輯
- 建立測試規範

### 測試架構

```
tests/
├── unit/
│   ├── hooks/
│   │   ├── useWebSocket.test.ts
│   │   ├── useMessages.test.ts
│   │   ├── useConversation.test.ts
│   │   ├── useChatWidget.test.ts
│   │   └── useVirtualScroll.test.ts
│   ├── utils/
│   │   ├── validation.test.ts
│   │   ├── sanitize.test.ts
│   │   ├── storage.test.ts
│   │   └── persistence.test.ts
│   └── api/
│       └── supportApi.test.ts
├── integration/
│   ├── ChatWidget.test.tsx
│   └── MessageFlow.test.tsx
└── setup.ts
```

### 測試範例

#### Hook 測試

```typescript
// tests/unit/hooks/useMessages.test.ts

import { renderHook, act } from '@testing-library/react-hooks'
import { useMessages } from '../../../src/hooks/useMessages'

describe('useMessages', () => {
  it('應該初始化為空訊息列表', () => {
    const { result } = renderHook(() => useMessages({
      apiBaseUrl: 'http://localhost',
      conversationId: null
    }))

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('應該能夠發送訊息', async () => {
    const { result } = renderHook(() => useMessages({
      apiBaseUrl: 'http://localhost',
      conversationId: 'SESS-123'
    }))

    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].content).toBe('Hello')
  })

  it('發送失敗時應該設置錯誤狀態', async () => {
    // Mock API 失敗
    // ...
  })
})
```

#### 工具函數測試

```typescript
// tests/unit/utils/validation.test.ts

import { validateMessageContent, messageSchema } from '../../../src/utils/validation'

describe('validateMessageContent', () => {
  it('應該通過有效的訊息', () => {
    const result = validateMessageContent('Hello, support!')
    expect(result.success).toBe(true)
  })

  it('應該拒絕空訊息', () => {
    const result = validateMessageContent('')
    expect(result.success).toBe(false)
    expect(result.error).toContain('不能為空')
  })

  it('應該拒絕超長訊息', () => {
    const longMessage = 'a'.repeat(2001)
    const result = validateMessageContent(longMessage)
    expect(result.success).toBe(false)
    expect(result.error).toContain('2000')
  })

  it('應該清理 XSS 內容', () => {
    const result = messageSchema.parse({
      content: '<script>alert("xss")</script>Hello'
    })
    expect(result.content).not.toContain('<script>')
  })
})
```

#### 組件測試

```typescript
// tests/integration/ChatWidget.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SupportChatWidget } from '../../src'

describe('SupportChatWidget', () => {
  it('應該渲染觸發按鈕', () => {
    render(
      <SupportChatWidget
        apiBaseUrl="http://localhost"
        wsUrl="ws://localhost"
      />
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('點擊觸發按鈕應該開啟聊天視窗', () => {
    render(
      <SupportChatWidget
        apiBaseUrl="http://localhost"
        wsUrl="ws://localhost"
      />
    )

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('客服支援')).toBeInTheDocument()
  })

  it('應該能夠發送訊息', async () => {
    render(
      <SupportChatWidget
        apiBaseUrl="http://localhost"
        wsUrl="ws://localhost"
        defaultOpen
      />
    )

    const input = screen.getByPlaceholderText('輸入訊息...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })
})
```

### 測試配置

```typescript
// tests/setup.ts

import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock WebSocket
class WebSocketMock {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn()
}
global.WebSocket = WebSocketMock as any
```

### 驗收標準

- [ ] 單元測試覆蓋率 ≥ 80%
- [ ] 所有 Hooks 有測試
- [ ] 所有工具函數有測試
- [ ] 關鍵組件有整合測試
- [ ] CI/CD 自動執行測試

---

## 3.4 E2E 測試

### 改進目標

- 覆蓋關鍵用戶流程
- 自動化回歸測試
- 支援多瀏覽器

### 測試架構

```
e2e/
├── fixtures/
│   └── test-data.ts
├── pages/
│   └── ChatWidgetPage.ts       # Page Object Model
├── tests/
│   ├── open-close.spec.ts
│   ├── send-message.spec.ts
│   ├── reconnect.spec.ts
│   └── offline.spec.ts
└── playwright.config.ts
```

### E2E 測試範例

```typescript
// e2e/tests/send-message.spec.ts

import { test, expect } from '@playwright/test'
import { ChatWidgetPage } from '../pages/ChatWidgetPage'

test.describe('發送訊息流程', () => {
  let chatWidget: ChatWidgetPage

  test.beforeEach(async ({ page }) => {
    chatWidget = new ChatWidgetPage(page)
    await chatWidget.goto()
  })

  test('應該能夠發送訊息並看到在列表中', async () => {
    await chatWidget.open()
    await chatWidget.sendMessage('Hello, I need help')

    await expect(chatWidget.getLastMessage()).toHaveText('Hello, I need help')
    await expect(chatWidget.getLastMessage()).toHaveClass(/customer/)
  })

  test('發送後應該清空輸入框', async () => {
    await chatWidget.open()
    await chatWidget.sendMessage('Test message')

    await expect(chatWidget.input).toHaveValue('')
  })

  test('空訊息不應該被發送', async () => {
    await chatWidget.open()
    const messageCount = await chatWidget.getMessageCount()

    await chatWidget.clickSend()

    expect(await chatWidget.getMessageCount()).toBe(messageCount)
  })
})
```

### Page Object Model

```typescript
// e2e/pages/ChatWidgetPage.ts

import { Page, Locator } from '@playwright/test'

export class ChatWidgetPage {
  readonly page: Page
  readonly trigger: Locator
  readonly window: Locator
  readonly input: Locator
  readonly sendButton: Locator
  readonly messages: Locator

  constructor(page: Page) {
    this.page = page
    this.trigger = page.locator('[data-testid="chat-trigger"]')
    this.window = page.locator('[data-testid="chat-window"]')
    this.input = page.locator('[data-testid="chat-input"]')
    this.sendButton = page.locator('[data-testid="chat-send"]')
    this.messages = page.locator('[data-testid="chat-message"]')
  }

  async goto() {
    await this.page.goto('/demo')
  }

  async open() {
    await this.trigger.click()
    await this.window.waitFor({ state: 'visible' })
  }

  async sendMessage(text: string) {
    await this.input.fill(text)
    await this.sendButton.click()
  }

  // ...
}
```

### 驗收標準

- [ ] 關鍵流程有 E2E 測試
- [ ] 測試可在 CI 環境執行
- [ ] 支援 Chromium、Firefox、WebKit
- [ ] 測試結果有截圖和錄影
- [ ] 測試執行時間 < 5 分鐘

---

## 依賴變更

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/react-hooks": "^8.0.1",
    "@playwright/test": "^1.48.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

---

## 相關文檔

- [返回主計劃](../IMPROVEMENT_PLAN.md)
- [Phase 2: 程式碼品質提升](./PHASE_2_CODE_QUALITY.md)
- [Phase 4: 文檔完善](./PHASE_4_DOCUMENTATION.md)

---

**文檔版本**: 1.0.0
**建立日期**: 2026-01-26
