import { vi } from 'vitest'

// Mock persistence to prevent actual fetch calls during syncPending effect
vi.mock('../../src/utils/persistence', async () => {
  const actual = (await vi.importActual('../../src/utils/persistence')) as any
  return {
    ...actual,
    chatPersistence: {
      ...actual.chatPersistence,
      syncPendingMessages: vi.fn().mockResolvedValue(undefined),
    },
  }
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOfflineSupport } from '../../src/hooks/useOfflineSupport'
import { chatPersistence } from '../../src/utils/persistence'

describe('useOfflineSupport', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Reset navigator.onLine to true for each test
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  it('應該偵測初始網路狀態', () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    expect(result.current.isOnline).toBe(true)
  })

  it('應該將訊息加入待發送佇列', async () => {
    // 模擬離線，防止立即同步
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })

    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    await act(async () => {
      result.current.queueMessage('Hello')
    })

    expect(result.current.pendingCount).toBe(1)
  })

  it('應該在上線時觸發同步', async () => {
    const onSyncSuccess = vi.fn()

    // 模擬離線開始
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })

    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
        onSyncSuccess,
      })
    )

    // 加入待發送訊息
    await act(async () => {
      result.current.queueMessage('Hello')
    })

    expect(result.current.pendingCount).toBe(1)

    // 切換到上線
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      })
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOnline).toBe(true)

    // 等待同步完成（由 useEffect 觸發）
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0)
    })
  })

  it('應該在離線時更新狀態', async () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      })
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOnline).toBe(false)
  })

  it('應該在沒有會話 ID 時不加入佇列', async () => {
    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: null,
      })
    )

    await act(async () => {
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

    // 模擬離線以防止自動同步
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })

    const { result } = renderHook(() =>
      useOfflineSupport({
        apiConfig: { baseUrl: 'https://api.gravito.io' },
        conversationId: 'CONV-123',
      })
    )

    expect(result.current.pendingCount).toBe(1)
  })
})
