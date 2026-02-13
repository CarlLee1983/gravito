/**
 * InitiatePayment Use Case 單元測試
 *
 * 測試支付初始化流程，包括金額驗證、貨幣驗證、支付方式驗證
 */

import { InitiatePaymentUseCase } from '@application/payment/InitiatePayment'
import type { PaymentRepository } from '@infrastructure/repositories/PaymentRepository'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('InitiatePaymentUseCase', () => {
  let useCase: InitiatePaymentUseCase
  let mockPaymentRepository: any

  beforeEach(() => {
    mockPaymentRepository = {
      create: vi.fn(),
    }

    useCase = new InitiatePaymentUseCase(mockPaymentRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('有效支付初始化', () => {
    it('應成功初始化支付', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card',
        gateway: 'stripe',
        status: 'pending',
      })

      const result = await useCase.execute(request)

      expect(result.id).toBe('payment-1')
      expect(result.orderId).toBe('order-1')
      expect(result.amount).toBe(5000)
      expect(mockPaymentRepository.create).toHaveBeenCalled()
    })

    it('應支持多種支付方式', async () => {
      const methods = ['card', 'paypal', 'bank_transfer'] as const

      for (const method of methods) {
        mockPaymentRepository.create.mockResolvedValue({
          id: `payment-${method}`,
          method,
        })

        const request = {
          orderId: 'order-1',
          userId: 'user-1',
          amount: 5000,
          currency: 'USD',
          method,
          gateway: 'stripe' as const,
        }

        const result = await useCase.execute(request)
        expect(result.method).toBe(method)
      }
    })

    it('應支持多種支付網關', async () => {
      const gateways = ['stripe', 'paypal', 'square'] as const

      for (const gateway of gateways) {
        mockPaymentRepository.create.mockResolvedValue({
          id: `payment-${gateway}`,
          gateway,
        })

        const request = {
          orderId: 'order-1',
          userId: 'user-1',
          amount: 5000,
          currency: 'USD',
          method: 'card' as const,
          gateway,
        }

        const result = await useCase.execute(request)
        expect(result.gateway).toBe(gateway)
      }
    })
  })

  describe('金額驗證', () => {
    it('應拒絕零金額', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 0,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid amount')
    })

    it('應拒絕負金額', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: -5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid amount')
    })

    it('應接受正金額', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-1',
        amount: 5000,
      })

      const result = await useCase.execute(request)

      expect(result.amount).toBe(5000)
    })
  })

  describe('貨幣驗證', () => {
    it('應接受有效的貨幣代碼', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY']

      for (const currency of currencies) {
        mockPaymentRepository.create.mockResolvedValue({
          id: `payment-${currency}`,
          currency,
        })

        const request = {
          orderId: 'order-1',
          userId: 'user-1',
          amount: 5000,
          currency,
          method: 'card' as const,
          gateway: 'stripe' as const,
        }

        const result = await useCase.execute(request)
        expect(result.currency).toBe(currency)
      }
    })

    it('應拒絕無效的貨幣代碼', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'INVALID',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid currency')
    })

    it('應拒絕空貨幣代碼', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: '',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid currency')
    })
  })

  describe('支付方式驗證', () => {
    it('應拒絕無效的支付方式', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'invalid' as any,
        gateway: 'stripe' as const,
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid payment method')
    })

    it('應接受有效的支付方式', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-1',
        method: 'card',
      })

      const result = await useCase.execute(request)

      expect(result.method).toBe('card')
    })
  })

  describe('支付網關驗證', () => {
    it('應拒絕無效的支付網關', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'invalid' as any,
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid payment gateway')
    })

    it('應接受有效的支付網關', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-1',
        gateway: 'stripe',
      })

      const result = await useCase.execute(request)

      expect(result.gateway).toBe('stripe')
    })
  })

  describe('支付方式與網關兼容性', () => {
    it('應接受兼容的支付方式和網關組合', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-1',
      })

      const result = await useCase.execute(request)

      expect(result.id).toBe('payment-1')
    })

    it('應拒絕不兼容的支付方式和網關組合', async () => {
      // 假設某些組合不兼容
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'bank_transfer' as const,
        gateway: 'square' as const, // 假設此組合不兼容
      }

      await expect(useCase.execute(request)).rejects.toThrow('not compatible')
    })
  })

  describe('支付記錄創建', () => {
    it('應創建支付記錄', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-1',
      })

      await useCase.execute(request)

      expect(mockPaymentRepository.create).toHaveBeenCalled()
      const createCall = mockPaymentRepository.create.mock.calls[0][0]
      expect(createCall.orderId).toBe('order-1')
      expect(createCall.userId).toBe('user-1')
      expect(createCall.amount).toBe(5000)
    })

    it('應返回創建的支付記錄', async () => {
      const request = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card' as const,
        gateway: 'stripe' as const,
      }

      const mockPayment = {
        id: 'payment-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'USD',
        method: 'card',
        gateway: 'stripe',
        status: 'pending',
      }

      mockPaymentRepository.create.mockResolvedValue(mockPayment)

      const result = await useCase.execute(request)

      expect(result).toEqual(mockPayment)
    })
  })
})
