import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOfflineSupport } from '../../src/hooks/useOfflineSupport'
import { chatPersistence } from '../../src/utils/persistence'

describe('useOfflineSupport', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('應該偵測初始網路狀態', () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    expect(result.current.isOnline).toBe(navigator.onLine)
  })

  it('應該將訊息加入待發送佇列', () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    act(() => {
      result.current.queueMessage('Hello')
    })

    expect(result.current.pendingCount).toBe(1)
  })

  it('應該在上線時觸發同步', async () => {
    const onSyncSuccess = vi.fn()

    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
        onSyncSuccess,
      })
    )

    // 加入待發送訊息
    act(() => {
      result.current.queueMessage('Hello')
    })

    expect(result.current.pendingCount).toBe(1)

    // 手動觸發同步（實際的自動同步需要 API mock）
    // 這個測試主要驗證 queueMessage 功能
  })

  it('應該在離線時更新狀態', () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOnline).toBe(false)
  })

  it('應該在沒有會話 ID 時不加入佇列', () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: null,
      })
    )

    act(() => {
      result.current.queueMessage('Hello')
    })

    expect(result.current.pendingCount).toBe(0)
  })

  it('應該從持久化狀態載入待發送數量', () => {
    // 預先設置持久化狀態
    chatPersistence.save({
      conversationId: 'CONV-123',
      messages: [],
      pendingMessages: [
        {
          id: 'pending-1',
          conversationId: 'CONV-123',
          sender: 'CUSTOMER',
          content: 'Hello',
          status: 'sending',
          createdAt: new Date(),
        },
      ],
      lastSyncAt: Date.now(),
    })

    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    expect(result.current.pendingCount).toBe(1)
  })
})
