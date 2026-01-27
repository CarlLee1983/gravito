import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupportApi } from '../../../src/api/supportApi'
import type { ChatMessage, Conversation, ConversationContext } from '../../../src/types'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('supportApi', () => {
  const baseUrl = 'https://api.test.com'
  let api: ReturnType<typeof createSupportApi>

  beforeEach(() => {
    vi.clearAllMocks()
    api = createSupportApi({ baseUrl })
  })

  describe('createConversation', () => {
    it('應該成功建立會話', async () => {
      const mockConversation: Conversation = {
        id: 'CONV-123',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      })

      const result = await api.createConversation()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConversation)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/support/conversations`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('應該傳送會話上下文', async () => {
      const context: ConversationContext = {
        type: 'ORDER',
        id: 'ORD-123',
        title: '訂單問題',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'CONV-123' }),
      })

      await api.createConversation(context)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.context).toEqual(context)
    })

    it('應該處理 404 錯誤', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await api.createConversation()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })

    it('應該處理伺服器錯誤', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await api.createConversation()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SERVER_ERROR')
    })

    it('應該處理網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await api.createConversation()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NETWORK_ERROR')
    })
  })

  describe('getConversation', () => {
    it('應該成功取得會話資訊', async () => {
      const mockConversation: Conversation = {
        id: 'CONV-123',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      })

      const result = await api.getConversation('CONV-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConversation)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/support/conversations/CONV-123`,
        expect.any(Object)
      )
    })

    it('會話不存在時應該回傳錯誤', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await api.getConversation('INVALID')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })
  })

  describe('sendMessage', () => {
    it('應該成功發送訊息', async () => {
      const mockMessage: ChatMessage = {
        id: 'MSG-123',
        conversationId: 'CONV-123',
        sender: 'CUSTOMER',
        content: 'Hello',
        status: 'sent',
        createdAt: new Date(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessage,
      })

      const result = await api.sendMessage('CONV-123', 'Hello')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMessage)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/support/conversations/CONV-123/messages`,
        expect.objectContaining({
          method: 'POST',
        })
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.content).toBe('Hello')
    })

    it('應該處理頻率限制', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      const result = await api.sendMessage('CONV-123', 'Hello')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('RATE_LIMITED')
    })
  })

  describe('getMessages', () => {
    it('應該成功取得訊息列表', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'MSG-1',
          conversationId: 'CONV-123',
          sender: 'CUSTOMER',
          content: 'Hello',
          status: 'sent',
          createdAt: new Date(),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: mockMessages,
          hasMore: false,
        }),
      })

      const result = await api.getMessages('CONV-123')

      expect(result.success).toBe(true)
      expect(result.data?.messages).toEqual(mockMessages)
      expect(result.data?.hasMore).toBe(false)
    })

    it('應該傳送分頁參數', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [], hasMore: false }),
      })

      await api.getMessages('CONV-123', {
        limit: 20,
        cursor: 'cursor-123',
        direction: 'before',
      })

      const url = mockFetch.mock.calls[0][0]
      expect(url).toContain('limit=20')
      expect(url).toContain('cursor=cursor-123')
      expect(url).toContain('direction=before')
    })
  })

  describe('自訂標頭', () => {
    it('應該支援自訂標頭', async () => {
      const apiWithHeaders = createSupportApi({
        baseUrl,
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'CONV-123' }),
      })

      await apiWithHeaders.createConversation()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'value',
          }),
        })
      )
    })
  })
})
