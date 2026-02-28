import { describe, expect, it, mock } from 'bun:test'
import { FlashSaleErrorCode } from '../../../../src/Application/Errors/FlashSaleError'
import type { IProductRepository } from '../../../../src/Domain/Contracts/IProductRepository'
import { injectInventoryHolder } from '../../../../src/Domain/DCI/Roles/InventoryHolderRole'
import { Product } from '../../../../src/Domain/Entities/Product'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

/**
 * InventoryHolderRole 測試
 *
 * 驗證庫存持有者角色的庫存扣減/釋放邏輯
 */
describe('InventoryHolderRole', () => {
  const defaultPrice = Money.of(299)
  const defaultCost = Money.of(150)

  const createProduct = (stock = 100) =>
    Product.create(
      'prod-1',
      'Test Product',
      'SKU-001',
      'A test product',
      defaultPrice,
      defaultCost,
      Stock.of(stock),
      []
    )

  const createMockRepo = (): IProductRepository => ({
    save: mock(() => Promise.resolve()),
    findById: mock(() => Promise.resolve(null)),
    findAll: mock(() => Promise.resolve([])),
    delete: mock(() => Promise.resolve()),
    exists: mock(() => Promise.resolve(false)),
    findBySku: mock(() => Promise.resolve(null)),
    findByIds: mock(() => Promise.resolve([])),
    updateStock: mock(() => Promise.resolve()),
  })

  describe('deductInventory', () => {
    it('應正確扣減庫存並呼叫 repository.save', async () => {
      const product = createProduct(10)
      const repo = createMockRepo()
      const holder = injectInventoryHolder(product, repo)

      await holder.deductInventory(3)

      expect(product.stock.quantity).toBe(7)
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('扣減至零庫存應成功', async () => {
      const product = createProduct(5)
      const repo = createMockRepo()
      const holder = injectInventoryHolder(product, repo)

      await holder.deductInventory(5)

      expect(product.stock.quantity).toBe(0)
      expect(product.stock.isAvailable).toBe(false)
    })

    it('庫存不足時應拋出 INSUFFICIENT_STOCK 錯誤', async () => {
      const product = createProduct(3)
      const repo = createMockRepo()
      const holder = injectInventoryHolder(product, repo)

      try {
        await holder.deductInventory(5)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
      }

      // 失敗時不應呼叫 save
      expect(repo.save).toHaveBeenCalledTimes(0)
    })

    it('扣減數量為零時應拋出錯誤', async () => {
      const product = createProduct(10)
      const repo = createMockRepo()
      const holder = injectInventoryHolder(product, repo)

      try {
        await holder.deductInventory(0)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })
  })

  describe('releaseInventory', () => {
    it('應正確釋放庫存並呼叫 repository.save', async () => {
      const product = createProduct(5)
      const repo = createMockRepo()
      const holder = injectInventoryHolder(product, repo)

      await holder.releaseInventory(3)

      expect(product.stock.quantity).toBe(8)
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('釋放數量為零時應拋出錯誤', async () => {
      const product = createProduct(5)
      const repo = createMockRepo()
      const holder = injectInventoryHolder(product, repo)

      try {
        await holder.releaseInventory(0)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })
  })
})
