import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMessages } from '../../../src/hooks/useMessages'

// Mock createSupportApi
const mockGetMessages = vi.fn()
const mockSendMessage = vi.fn()

vi.mock('../../../src/api/supportApi', () => ({
  createSupportApi: vi.fn(() => ({
    getMessages: mockGetMessages,
    sendMessage: mockSendMessage,
  })),
}))

describe('useMessages', () => {
  const apiBaseUrl = 'https://api.test.com'

  beforeEach(() => {
    vi.clearAllMocks()
    // Default success response
    mockGetMessages.mockResolvedValue({
      success: true,
      data: { messages: [], hasMore: false },
    })
  })

  afterEach(() => {
    cleanup()
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

  it('應該能夠設置錯誤狀態', async () => {
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

    // 等待加載完成和錯誤狀態設置
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error?.message).toBe('Test error')
    expect(result.current.messages).toEqual([])
  })
})
