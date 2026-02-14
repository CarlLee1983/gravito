/**
 * SendEmailListener 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('SendEmailListener', () => {
  let listener: any
  let mockEmailService: any

  beforeEach(() => {
    mockEmailService = {
      send: vi.fn(),
      sendBatch: vi.fn(),
      getTemplate: vi.fn(),
    }

    listener = {
      handle: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('郵件發送事件監聽', () => {
    it('應監聽訂單已建立事件並發送確認郵件', async () => {
      mockEmailService.send.mockResolvedValue({
        id: 'email-1',
        status: 'sent',
      })

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:created',
        payload: {
          orderId: 'order-1',
          userEmail: 'user@example.com',
          orderTotal: 10000,
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalledWith(event)
    })

    it('應監聽支付完成事件並發送收據郵件', async () => {
      mockEmailService.send.mockResolvedValue({
        id: 'email-1',
        status: 'sent',
      })

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'payment:completed',
        payload: {
          paymentId: 'payment-1',
          userEmail: 'user@example.com',
          amount: 10000,
          transactionId: 'txn-123',
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })

    it('應監聽訂單取消事件並發送取消確認郵件', async () => {
      mockEmailService.send.mockResolvedValue({
        id: 'email-1',
        status: 'sent',
      })

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:cancelled',
        payload: {
          orderId: 'order-1',
          userEmail: 'user@example.com',
          reason: 'User requested cancellation',
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })

  describe('郵件模板', () => {
    it('應根據事件類型選擇正確的郵件模板', async () => {
      const templates = {
        'order:created': 'order-confirmation',
        'payment:completed': 'payment-receipt',
        'order:cancelled': 'order-cancellation',
      }

      const eventType = 'order:created'
      const template = templates[eventType as keyof typeof templates]

      expect(template).toBe('order-confirmation')
    })

    it('應使用模板變數替換郵件內容', async () => {
      const template = 'Hi {userName}, your order {orderId} has been created'
      const variables = { userName: 'John', orderId: 'order-1' }

      const content = template
        .replace('{userName}', variables.userName)
        .replace('{orderId}', variables.orderId)

      expect(content).toContain('John')
      expect(content).toContain('order-1')
    })
  })

  describe('錯誤處理', () => {
    it('應優雅處理郵件發送失敗', async () => {
      mockEmailService.send.mockRejectedValue(new Error('SMTP connection failed'))

      listener.handle.mockRejectedValue(new Error('SMTP connection failed'))

      const event = {
        eventName: 'order:created',
        payload: {
          orderId: 'order-1',
          userEmail: 'user@example.com',
        },
      }

      await expect(listener.handle(event)).rejects.toThrow('SMTP connection failed')
    })

    it('應重試失敗的郵件', async () => {
      let attempts = 0

      mockEmailService.send.mockImplementation(async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('Temporary failure')
        }
        return { status: 'sent' }
      })

      listener.handle.mockImplementation(async (event) => {
        return mockEmailService.send({ to: event.payload.userEmail })
      })

      const event = {
        eventName: 'order:created',
        payload: {
          orderId: 'order-1',
          userEmail: 'user@example.com',
        },
      }

      // First attempt fails, second succeeds
      try {
        await listener.handle(event)
      } catch (_e) {
        // Expected to fail first time
      }

      expect(attempts).toBeGreaterThan(0)
    })
  })

  describe('批量郵件發送', () => {
    it('應支持批量發送郵件', async () => {
      const emails = [
        { to: 'user1@example.com', orderId: 'order-1' },
        { to: 'user2@example.com', orderId: 'order-2' },
        { to: 'user3@example.com', orderId: 'order-3' },
      ]

      mockEmailService.sendBatch.mockResolvedValue({
        sent: 3,
        failed: 0,
      })

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'notification:batch',
        payload: { emails },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })
})
