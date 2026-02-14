/**
 * RefundPayment Use Case 單元測試
 */

import { RefundPaymentUseCase } from '@application/payment/RefundPayment'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('RefundPaymentUseCase', () => {
  let useCase: RefundPaymentUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      refund: vi.fn(),
    }
    useCase = new RefundPaymentUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('退款', () => {
    it('應成功退款', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'payment-1',
        status: 'completed',
        amount: 10000,
      })

      mockRepository.refund.mockResolvedValue({
        id: 'payment-1',
        status: 'refunded',
        amount: 10000,
      })

      const result = await useCase.execute({
        paymentId: 'payment-1',
        reason: '客戶要求退款',
      })

      expect(result.status).toBe('refunded')
      expect(mockRepository.refund).toHaveBeenCalledWith('payment-1', {
        reason: '客戶要求退款',
        amount: undefined,
      })
    })

    it('缺少支付 ID 時應拋出錯誤', async () => {
      await expect(
        useCase.execute({
          paymentId: '',
          reason: '客戶要求退款',
        })
      ).rejects.toThrow('Payment ID is required')
    })

    it('缺少退款原因時應拋出錯誤', async () => {
      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          reason: '',
        })
      ).rejects.toThrow('Refund reason is required')
    })

    it('支付不存在時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(
        useCase.execute({
          paymentId: 'invalid-id',
          reason: '客戶要求退款',
        })
      ).rejects.toThrow('Payment not found')
    })

    it('支付無法退款時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'payment-1',
        status: 'pending',
        amount: 10000,
      })

      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          reason: '客戶要求退款',
        })
      ).rejects.toThrow()
    })

    it('退款金額超過支付金額時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'payment-1',
        status: 'completed',
        amount: 10000,
      })

      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          reason: '客戶要求退款',
          amount: 15000,
        })
      ).rejects.toThrow('Refund amount cannot exceed payment amount')
    })

    it('退款失敗時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'payment-1',
        status: 'completed',
        amount: 10000,
      })

      mockRepository.refund.mockResolvedValue(null)

      await expect(
        useCase.execute({
          paymentId: 'payment-1',
          reason: '客戶要求退款',
        })
      ).rejects.toThrow('Failed to refund payment')
    })
  })
})
