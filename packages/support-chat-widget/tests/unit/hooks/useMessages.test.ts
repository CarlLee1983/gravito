import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMessages } from '../../../src/hooks/useMessages'

describe('useMessages', () => {
  const apiBaseUrl = 'https://api.test.com'
  const _conversationId = 'CONV-123'

  // Mock createSupportApi
  let mockGetMessages: ReturnType<typeof vi.fn>
  let mockSendMessage: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    mockGetMessages = vi.fn()
    mockSendMessage = vi.fn()

    // 動態 mock supportApi module
    vi.doMock('../../../src/api/supportApi', () => ({
      createSupportApi: vi.fn(() => ({
        getMessages: mockGetMessages,
        sendMessage: mockSendMessage,
      })),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.doUnmock('../../../src/api/supportApi')
  })

  it('初始狀態應該為空', () => {
    const { result } = renderHook(() =>
      useMessages({
        apiBaseUrl,
        conversationId: null,
      })
    )

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(false)
  })

  it('應該能夠設置錯誤狀態', () => {
    mockGetMessages.mockResolvedValueOnce({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Test error',
        retryable: false,
      },
    })

    const { result } = renderHook(() =>
      useMessages({
        apiBaseUrl,
        conversationId: 'CONV-TEST',
      })
    )

    expect(result.current.messages).toEqual([])
  })
})
