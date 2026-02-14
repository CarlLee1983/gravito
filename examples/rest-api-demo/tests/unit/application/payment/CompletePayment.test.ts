/**
 * CompletePayment Use Case 單元測試
 */

import { CompletePaymentUseCase } from '@application/payment/CompletePayment'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CompletePaymentUseCase', () => {
  let useCase: CompletePaymentUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      complete: vi.fn(),
    }
    useCase = new CompletePaymentUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('完成支付', () => {
    it('應完成支付並返回支付記錄', async () => {
      mockRepository.complete.mockResolvedValue({
        id: 'payment-1',
        status: 'completed',
        transactionId: 'txn-123',
        receiptUrl: 'https://example.com/receipt.pdf',
      })

      const result = await useCase.execute({
        paymentId: 'payment-1',
        transactionId: 'txn-123',
        receiptUrl: 'https://example.com/receipt.pdf',
      })

      expect(result.status).toBe('completed')
      expect(result.transactionId).toBe('txn-123')
      expect(mockRepository.complete).toHaveBeenCalledWith('payment-1', {
        transactionId: 'txn-123',
        receiptUrl: 'https://example.com/receipt.pdf',
      })
    })

    it('缺少支付 ID 時應拋出錯誤', async () => {
      await expect(
        useCase.execute({
          paymentId: '',
          transactionId: 'txn-123',
        })
      ).rejects.toThrow('Payment ID and transaction ID are required')
    })

    it('缺少交易 ID 時應拋出錯誤', async () => {
      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          transactionId: '',
        })
      ).rejects.toThrow('Payment ID and transaction ID are required')
    })

    it('支付完成失敗時應拋出錯誤', async () => {
      mockRepository.complete.mockResolvedValue(null)

      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          transactionId: 'txn-123',
        })
      ).rejects.toThrow('Failed to complete payment')
    })
  })
})
