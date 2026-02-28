import { describe, expect, it, mock } from 'bun:test'
import { FlashSaleErrorCode } from '../../../../src/Application/Errors/FlashSaleError'
import type { IProductRepository } from '../../../../src/Domain/Contracts/IProductRepository'
import { injectCatalogManager } from '../../../../src/Domain/DCI/Roles/CatalogManagerRole'
import { Product } from '../../../../src/Domain/Entities/Product'
import { ProductStatus } from '../../../../src/Domain/Models'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

/**
 * CatalogManagerRole 測試
 *
 * 驗證目錄管理者角色的商品上下架邏輯
 */
describe('CatalogManagerRole', () => {
  const defaultPrice = Money.of(299)
  const defaultCost = Money.of(150)

  const createActiveProduct = () =>
    Product.create(
      'prod-1',
      'Test Product',
      'SKU-001',
      'A test product',
      defaultPrice,
      defaultCost,
      Stock.of(100),
      []
    )

  const createInactiveProduct = () =>
    Product.reconstitute('prod-2', {
      name: 'Inactive Product',
      sku: 'SKU-002',
      description: 'Inactive',
      price: defaultPrice,
      cost: defaultCost,
      stock: Stock.of(50),
      images: [],
      status: ProductStatus.INACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

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

  describe('activateProduct', () => {
    it('INACTIVE 商品應成功啟用並呼叫 repository.save', async () => {
      const product = createInactiveProduct()
      const repo = createMockRepo()
      const manager = injectCatalogManager(product, repo)

      await manager.activateProduct()

      expect(product.status).toBe(ProductStatus.ACTIVE)
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('已經 ACTIVE 的商品應拋出 PRODUCT_INACTIVE 錯誤（不允許重複啟用）', async () => {
      const product = createActiveProduct()
      const repo = createMockRepo()
      const manager = injectCatalogManager(product, repo)

      try {
        await manager.activateProduct()
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string; message: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }

      expect(repo.save).toHaveBeenCalledTimes(0)
    })
  })

  describe('deactivateProduct', () => {
    it('ACTIVE 商品應成功停用並呼叫 repository.save', async () => {
      const product = createActiveProduct()
      const repo = createMockRepo()
      const manager = injectCatalogManager(product, repo)

      await manager.deactivateProduct()

      expect(product.status).toBe(ProductStatus.INACTIVE)
      expect(repo.save).toHaveBeenCalledTimes(1)
    })

    it('已經 INACTIVE 的商品應拋出錯誤（不允許重複停用）', async () => {
      const product = createInactiveProduct()
      const repo = createMockRepo()
      const manager = injectCatalogManager(product, repo)

      try {
        await manager.deactivateProduct()
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      }

      expect(repo.save).toHaveBeenCalledTimes(0)
    })
  })
})
