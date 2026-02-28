import { describe, expect, it } from 'bun:test'
import { FlashSaleErrorCode } from '../../../../src/Application/Errors/FlashSaleError'
import { injectPurchaser } from '../../../../src/Domain/DCI/Roles/PurchaserRole'
import { Product } from '../../../../src/Domain/Entities/Product'
import { ProductStatus } from '../../../../src/Domain/Models'
import { Money } from '../../../../src/Domain/ValueObjects/Money'
import { Stock } from '../../../../src/Domain/ValueObjects/Stock'

/**
 * PurchaserRole 測試
 *
 * 驗證購買者角色的商品可購買性驗證邏輯
 */
describe('PurchaserRole', () => {
  const defaultPrice = Money.of(299)
  const defaultCost = Money.of(150)

  const createActiveProduct = (stock = 100) =>
    Product.create(
      'prod-1',
      'Test Product',
      'SKU-001',
      'A test product',
      defaultPrice,
      defaultCost,
      Stock.of(stock),
      ['img1.jpg']
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

  describe('canPurchase', () => {
    it('ACTIVE 商品且庫存充足時應回傳 true', () => {
      const product = createActiveProduct(10)
      const purchaser = injectPurchaser(product)

      expect(purchaser.canPurchase(5)).toBe(true)
    })

    it('庫存恰好等於需求數量時應回傳 true', () => {
      const product = createActiveProduct(5)
      const purchaser = injectPurchaser(product)

      expect(purchaser.canPurchase(5)).toBe(true)
    })

    it('庫存不足時應回傳 false', () => {
      const product = createActiveProduct(3)
      const purchaser = injectPurchaser(product)

      expect(purchaser.canPurchase(5)).toBe(false)
    })

    it('庫存為零時應回傳 false', () => {
      const product = createActiveProduct(0)
      const purchaser = injectPurchaser(product)

      expect(purchaser.canPurchase(1)).toBe(false)
    })

    it('商品非 ACTIVE 狀態時應回傳 false', () => {
      const product = createInactiveProduct()
      const purchaser = injectPurchaser(product)

      expect(purchaser.canPurchase(1)).toBe(false)
    })
  })

  describe('validatePurchase', () => {
    it('有效購買不應拋出錯誤', () => {
      const product = createActiveProduct(10)
      const purchaser = injectPurchaser(product)

      expect(() => purchaser.validatePurchase(5)).not.toThrow()
    })

    it('商品非 ACTIVE 時應拋出 PRODUCT_INACTIVE 錯誤', () => {
      const product = createInactiveProduct()
      const purchaser = injectPurchaser(product)

      try {
        purchaser.validatePurchase(1)
        expect(true).toBe(false) // 不應到達此處
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.PRODUCT_INACTIVE)
      }
    })

    it('庫存不足時應拋出 INSUFFICIENT_STOCK 錯誤', () => {
      const product = createActiveProduct(3)
      const purchaser = injectPurchaser(product)

      try {
        purchaser.validatePurchase(5)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
      }
    })

    it('數量為零或負數時應拋出 INVALID_QUANTITY 錯誤', () => {
      const product = createActiveProduct(10)
      const purchaser = injectPurchaser(product)

      try {
        purchaser.validatePurchase(0)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })

    it('數量超過上限（1000）時應拋出 INVALID_QUANTITY 錯誤', () => {
      const product = createActiveProduct(5000)
      const purchaser = injectPurchaser(product)

      try {
        purchaser.validatePurchase(1001)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })
  })
})
