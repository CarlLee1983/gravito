import { describe, expect, it, mock } from 'bun:test'
import { FlashSaleErrorCode } from '../../../../src/Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../../../src/Domain/Contracts/IOrderRepository'
import { injectOrderOwner } from '../../../../src/Domain/DCI/Roles/OrderOwnerRole'
import { Order } from '../../../../src/Domain/Entities/Order'
import { OrderConfirmed } from '../../../../src/Domain/Events/OrderConfirmed'
import { OrderStatus } from '../../../../src/Domain/Models'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../../src/Domain/ValueObjects/OrderItem'

/**
 * OrderOwnerRole 測試
 *
 * 驗證訂單擁有者角色的狀態轉換邏輯
 */
describe('OrderOwnerRole', () => {
  const createItems = () => [OrderItem.create('prod-1', 'Product A', 2, Money.of(100))]

  const createMockRepo = (): IOrderRepository => ({
    save: mock(() => Promise.resolve()),
    findById: mock(() => Promise.resolve(null)),
    findAll: mock(() => Promise.resolve([])),
    delete: mock(() => Promise.resolve()),
    exists: mock(() => Promise.resolve(false)),
    findByUserId: mock(() => Promise.resolve([])),
    findByDateRange: mock(() => Promise.resolve([])),
  })

  describe('confirm', () => {
    it('PENDING 訂單應成功確認並呼叫 repository.save', async () => {
      const order = Order.create('order-1', 'user-1', createItems())
      order.pullDomainEvents() // 清除 OrderCreated
      const repo = createMockRepo()
      const owner = injectOrderOwner(order, repo)

      await owner.confirm()

      expect(order.status).toBe(OrderStatus.CONFIRMED)
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('確認後應產生 OrderConfirmed Domain Event', async () => {
      const order = Order.create('order-1', 'user-1', createItems())
      order.pullDomainEvents() // 清除 OrderCreated
      const repo = createMockRepo()
      const owner = injectOrderOwner(order, repo)

      await owner.confirm()

      const events = order.pullDomainEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(OrderConfirmed)
    })

    it('非 PENDING 狀態不能確認，應拋出 INVALID_ORDER_STATUS 錯誤', async () => {
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items: createItems(),
        totalAmount: Money.of(200),
        status: OrderStatus.PAID,
        createdAt: new Date(),
      })
      const repo = createMockRepo()
      const owner = injectOrderOwner(order, repo)

      try {
        await owner.confirm()
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }

      // 失敗時不應呼叫 save
      expect(repo.save).toHaveBeenCalledTimes(0)
    })
  })

  describe('cancel', () => {
    it('PENDING 訂單應成功取消並呼叫 repository.save', async () => {
      const order = Order.create('order-1', 'user-1', createItems())
      const repo = createMockRepo()
      const owner = injectOrderOwner(order, repo)

      await owner.cancel()

      expect(order.status).toBe(OrderStatus.CANCELLED)
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('CONFIRMED 訂單應成功取消', async () => {
      const order = Order.create('order-1', 'user-1', createItems())
      order.transitionToConfirmed()
      const repo = createMockRepo()
      const owner = injectOrderOwner(order, repo)

      await owner.cancel()

      expect(order.status).toBe(OrderStatus.CANCELLED)
    })

    it('已取消訂單不能再次取消，應拋出錯誤', async () => {
      const order = Order.reconstitute('order-1', {
        userId: 'user-1',
        items: createItems(),
        totalAmount: Money.of(200),
        status: OrderStatus.CANCELLED,
        createdAt: new Date(),
      })
      const repo = createMockRepo()
      const owner = injectOrderOwner(order, repo)

      try {
        await owner.cancel()
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }
    })
  })
})
