import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { FlashSaleErrorCode } from '../../../../src/Application/Errors/FlashSaleError'
import type { IOrderRepository } from '../../../../src/Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../../../../src/Domain/Contracts/IProductRepository'
import { BulkPurchaseContext } from '../../../../src/Domain/DCI/Contexts/BulkPurchaseContext'
import { Product } from '../../../../src/Domain/Entities/Product'
import { OrderStatus, ProductStatus } from '../../../../src/Domain/Models'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

/**
 * BulkPurchaseContext 整合測試
 *
 * 驗證多商品搶購流程：批量驗證 -> 扣減庫存（含回滾） -> 建立訂單
 */
describe('BulkPurchaseContext', () => {
  let productRepo: IProductRepository
  let orderRepo: IOrderRepository

  const createActiveProduct = (id: string, stock = 100) =>
    Product.create(
      id,
      `Product ${id}`,
      `SKU-${id}`,
      'A flash sale product',
      Money.of(100),
      Money.of(50),
      Stock.of(stock),
      ['img1.jpg']
    )

  beforeEach(() => {
    productRepo = {
      save: mock(() => Promise.resolve()),
      findById: mock(() => Promise.resolve(null)),
      findAll: mock(() => Promise.resolve([])),
      delete: mock(() => Promise.resolve()),
      exists: mock(() => Promise.resolve(false)),
      findBySku: mock(() => Promise.resolve(null)),
      findByIds: mock(() => Promise.resolve([])),
      updateStock: mock(() => Promise.resolve()),
    }

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

  describe('execute', () => {
    it('應完成 2 商品的搶購流程並建立含 2 個 items 的訂單', async () => {
      const product1 = createActiveProduct('prod-1', 50)
      const product2 = createActiveProduct('prod-2', 30)
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([product1, product2])

      const context = new BulkPurchaseContext(productRepo, orderRepo)
      const order = await context.execute('user-1', [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 3 },
      ])

      expect(order).toBeDefined()
      expect(order.userId).toBe('user-1')
      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.items).toHaveLength(2)
      expect(order.items[0].productId).toBe('prod-1')
      expect(order.items[0].quantity).toBe(2)
      expect(order.items[1].productId).toBe('prod-2')
      expect(order.items[1].quantity).toBe(3)
    })

    it('應正確計算多商品訂單的 totalAmount', async () => {
      const product1 = createActiveProduct('prod-1', 50)
      const product2 = createActiveProduct('prod-2', 30)
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([product1, product2])

      const context = new BulkPurchaseContext(productRepo, orderRepo)
      const order = await context.execute('user-1', [
        { productId: 'prod-1', quantity: 2 }, // 100 * 2 = 200
        { productId: 'prod-2', quantity: 3 }, // 100 * 3 = 300
      ])

      // totalAmount = 200 + 300 = 500
      expect(order.totalAmount.value).toBe(500)
    })

    it('任一商品不存在時應拋出 PRODUCT_NOT_FOUND 錯誤', async () => {
      const product1 = createActiveProduct('prod-1', 50)
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([product1])

      const context = new BulkPurchaseContext(productRepo, orderRepo)

      try {
        await context.execute('user-1', [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-nonexistent', quantity: 1 },
        ])
        expect.unreachable('Should have thrown')
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.PRODUCT_NOT_FOUND)
      }

      // 不應建立訂單
      expect(orderRepo.save).toHaveBeenCalledTimes(0)
    })

    it('任一商品非 ACTIVE 時應拋出 PRODUCT_INACTIVE 錯誤', async () => {
      const product1 = createActiveProduct('prod-1', 50)
      const product2 = Product.reconstitute('prod-2', {
        name: 'Inactive Product',
        sku: 'SKU-prod-2',
        description: 'Inactive',
        price: Money.of(100),
        cost: Money.of(50),
        stock: Stock.of(30),
        images: [],
        status: ProductStatus.INACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([product1, product2])

      const context = new BulkPurchaseContext(productRepo, orderRepo)

      try {
        await context.execute('user-1', [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 1 },
        ])
        expect.unreachable('Should have thrown')
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.PRODUCT_INACTIVE)
      }

      // 不應建立訂單
      expect(orderRepo.save).toHaveBeenCalledTimes(0)
    })

    it('任一商品庫存不足時應拋出 INSUFFICIENT_STOCK 錯誤', async () => {
      const product1 = createActiveProduct('prod-1', 50)
      const product2 = createActiveProduct('prod-2', 2) // 庫存不足
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([product1, product2])

      const context = new BulkPurchaseContext(productRepo, orderRepo)

      try {
        await context.execute('user-1', [
          { productId: 'prod-1', quantity: 10 },
          { productId: 'prod-2', quantity: 5 }, // 要求 5 個，但只有 2 個
        ])
        expect.unreachable('Should have thrown')
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
      }

      // 不應建立訂單
      expect(orderRepo.save).toHaveBeenCalledTimes(0)
    })

    it('後續商品扣減失敗時應回滾先前扣減的庫存', async () => {
      const product1 = createActiveProduct('prod-1', 50)
      const product2 = createActiveProduct('prod-2', 2) // 庫存將不足
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([product1, product2])

      const context = new BulkPurchaseContext(productRepo, orderRepo)

      try {
        await context.execute('user-1', [
          { productId: 'prod-1', quantity: 10 }, // 會先扣減
          { productId: 'prod-2', quantity: 5 }, // 會失敗
        ])
        expect.unreachable('Should have thrown')
      } catch {
        // 預期拋出錯誤
      }

      // 驗證 product1 的庫存已被回滾
      // save 應被呼叫 3 次：product1 扣減(1次) + product1 回滾(1次) + product2 驗證前查詢(0 次因為找不到)
      // 實際上應該是：
      // 1. product1.deductStock() + save
      // 2. product1.replenishStock() + save (回滾)
      expect(product1.stock.quantity).toBe(50) // 應被回滾至原始值
    })

    it('items 為空陣列時應拋出 INVALID_QUANTITY 錯誤', async () => {
      const context = new BulkPurchaseContext(productRepo, orderRepo)

      try {
        await context.execute('user-1', [])
        expect.unreachable('Should have thrown')
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }

      expect(orderRepo.save).toHaveBeenCalledTimes(0)
    })

    it('應完成 3 商品的搶購流程並驗證所有 items', async () => {
      const product1 = createActiveProduct('prod-1', 100)
      const product2 = createActiveProduct('prod-2', 50)
      const product3 = createActiveProduct('prod-3', 30)
      ;(productRepo.findByIds as ReturnType<typeof mock>).mockResolvedValue([
        product1,
        product2,
        product3,
      ])

      const context = new BulkPurchaseContext(productRepo, orderRepo)
      const order = await context.execute('user-1', [
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 3 },
        { productId: 'prod-3', quantity: 2 },
      ])

      expect(order.items).toHaveLength(3)
      expect(order.items[0].quantity).toBe(5)
      expect(order.items[1].quantity).toBe(3)
      expect(order.items[2].quantity).toBe(2)

      // 驗證庫存扣減
      expect(product1.stock.quantity).toBe(95)
      expect(product2.stock.quantity).toBe(47)
      expect(product3.stock.quantity).toBe(28)
    })
  })
})
