/**
 * PaymentController 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('PaymentController', () => {
  let mockCtx: any

  beforeEach(() => {
    mockCtx = {
      req: {
        json: vi.fn(),
        param: vi.fn(),
      },
      json: vi.fn(),
      get: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化支付', () => {
    it('應成功初始化支付', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'InitiatePaymentUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'payment-1',
                  orderId: 'order-1',
                  amount: 10000,
                  status: 'pending',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        orderId: 'order-1',
        amount: 10000,
        method: 'credit_card',
      })

      const useCase = mockCore.container.make('InitiatePaymentUseCase')!
      const result = await useCase.execute({
        orderId: 'order-1',
        amount: 10000,
        method: 'credit_card',
      })

      expect(result.id).toBe('payment-1')
      expect(result.status).toBe('pending')
    })

    it('初始化支付失敗時應拋出錯誤', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'InitiatePaymentUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('Invalid order')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('InitiatePaymentUseCase')!

      await expect(
        useCase.execute({
          orderId: 'invalid-id',
          amount: 10000,
          method: 'credit_card',
        })
      ).rejects.toThrow('Invalid order')
    })
  })

  describe('完成支付', () => {
    it('應成功完成支付', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'CompletePaymentUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'payment-1',
                  status: 'completed',
                  transactionId: 'txn-123',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('CompletePaymentUseCase')!
      const result = await useCase.execute({
        paymentId: 'payment-1',
        transactionId: 'txn-123',
      })

      expect(result.status).toBe('completed')
      expect(result.transactionId).toBe('txn-123')
    })

    it('支付完成失敗時應拋出錯誤', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'CompletePaymentUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('Failed to complete payment')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('CompletePaymentUseCase')!

      await expect(
        useCase.execute({
          paymentId: 'invalid-id',
          transactionId: 'txn-123',
        })
      ).rejects.toThrow('Failed to complete payment')
    })
  })

  describe('退款', () => {
    it('應成功退款', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'RefundPaymentUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'payment-1',
                  status: 'refunded',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('RefundPaymentUseCase')!
      const result = await useCase.execute({
        paymentId: 'payment-1',
        reason: '客戶要求退款',
      })

      expect(result.status).toBe('refunded')
    })

    it('支付無法退款時應拋出錯誤', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'RefundPaymentUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('Cannot refund this payment')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('RefundPaymentUseCase')!

      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          reason: '客戶要求退款',
        })
      ).rejects.toThrow('Cannot refund this payment')
    })
  })
})
