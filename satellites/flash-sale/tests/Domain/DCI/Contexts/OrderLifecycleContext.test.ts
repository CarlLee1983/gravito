import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { FlashSaleErrorCode } from '../../../../src/Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../../../src/Domain/Contracts/IOrderRepository'
import { OrderLifecycleContext } from '../../../../src/Domain/DCI/Contexts/OrderLifecycleContext'
import { Order } from '../../../../src/Domain/Entities/Order'
import { OrderStatus } from '../../../../src/Domain/Models'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../../src/Domain/ValueObjects/OrderItem'

/**
 * OrderLifecycleContext 整合測試
 *
 * 驗證訂單生命週期管理：確認、查詢、列表
 */
describe('OrderLifecycleContext', () => {
  let orderRepo: IOrderRepository

  const createItems = () => [OrderItem.create('prod-1', 'Product A', 2, Money.of(100))]

  beforeEach(() => {
    orderRepo = {
      save: mock(() => Promise.resolve()),
      findById: mock(() => Promise.resolve(null)),
      findAll: mock(() => Promise.resolve([])),
      delete: mock(() => Promise.resolve()),
      exists: mock(() => Promise.resolve(false)),
      findByUserId: mock(() => Promise.resolve([])),
      findByDateRange: mock(() => Promise.resolve([])),
    }
  })

  describe('confirm', () => {
    it('應成功確認 PENDING 訂單', async () => {
      const order = Order.create('order-1', 'user-1', createItems())
      ;(orderRepo.findById as ReturnType<typeof mock>).mockResolvedValue(order)

      const context = new OrderLifecycleContext(orderRepo)
      const confirmed = await context.confirm('order-1')

      expect(confirmed.status).toBe(OrderStatus.CONFIRMED)
      expect(orderRepo.save).toHaveBeenCalledTimes(1)
    })

    it('訂單不存在時應拋出 ORDER_NOT_FOUND 錯誤', async () => {
      ;(orderRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null)

      const context = new OrderLifecycleContext(orderRepo)

      try {
        await context.confirm('order-nonexistent')
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.ORDER_NOT_FOUND)
      }
    })

    it('非 PENDING 狀態時應拋出 INVALID_ORDER_STATUS 錯誤', async () => {
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items: createItems(),
        totalAmount: Money.of(200),
        status: OrderStatus.PAID,
        createdAt: new Date(),
      })
      ;(orderRepo.findById as ReturnType<typeof mock>).mockResolvedValue(order)

      const context = new OrderLifecycleContext(orderRepo)

      try {
        await context.confirm('order-1')
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }
    })
  })

  describe('getOrder', () => {
    it('訂單存在時應回傳 Order', async () => {
      const order = Order.create('order-1', 'user-1', createItems())
      ;(orderRepo.findById as ReturnType<typeof mock>).mockResolvedValue(order)

      const context = new OrderLifecycleContext(orderRepo)
      const result = await context.getOrder('order-1')

      expect(result).toBeDefined()
      expect(result!.id).toBe('order-1')
    })

    it('訂單不存在時應回傳 null', async () => {
      ;(orderRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null)

      const context = new OrderLifecycleContext(orderRepo)
      const result = await context.getOrder('order-nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('listOrders', () => {
    it('應回傳指定用戶的訂單列表', async () => {
      const orders = [
        Order.create('order-1', 'user-1', createItems()),
        Order.create('order-2', 'user-1', createItems()),
      ]
      ;(orderRepo.findByUserId as ReturnType<typeof mock>).mockResolvedValue(orders)

      const context = new OrderLifecycleContext(orderRepo)
      const result = await context.listOrders('user-1')

      expect(result).toHaveLength(2)
      expect(orderRepo.findByUserId).toHaveBeenCalledWith('user-1')
    })

    it('用戶無訂單時應回傳空陣列', async () => {
      ;(orderRepo.findByUserId as ReturnType<typeof mock>).mockResolvedValue([])

      const context = new OrderLifecycleContext(orderRepo)
      const result = await context.listOrders('user-empty')

      expect(result).toHaveLength(0)
    })
  })
})
