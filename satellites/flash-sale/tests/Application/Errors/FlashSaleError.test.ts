import { describe, expect, it } from 'bun:test'
import { FlashSaleError, FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'

describe('FlashSaleErrorCode', () => {
  it('應包含所有預定義的錯誤代碼', () => {
    expect(FlashSaleErrorCode.INSUFFICIENT_STOCK).toBe('INSUFFICIENT_STOCK')
    expect(FlashSaleErrorCode.INVALID_QUANTITY).toBe('INVALID_QUANTITY')
    expect(FlashSaleErrorCode.PRODUCT_INACTIVE).toBe('PRODUCT_INACTIVE')
    expect(FlashSaleErrorCode.PRODUCT_NOT_FOUND).toBe('PRODUCT_NOT_FOUND')
    expect(FlashSaleErrorCode.ORDER_NOT_FOUND).toBe('ORDER_NOT_FOUND')
    expect(FlashSaleErrorCode.INVALID_ORDER_STATUS).toBe('INVALID_ORDER_STATUS')
    expect(FlashSaleErrorCode.CURRENCY_MISMATCH).toBe('CURRENCY_MISMATCH')
    expect(FlashSaleErrorCode.INVALID_AMOUNT).toBe('INVALID_AMOUNT')
  })
})

describe('FlashSaleError', () => {
  it('應正確建構錯誤實例', () => {
    const error = new FlashSaleError('Test error', FlashSaleErrorCode.INSUFFICIENT_STOCK, 409)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FlashSaleError)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
    expect(error.httpStatus).toBe(409)
    expect(error.name).toBe('FlashSaleError')
  })

  describe('靜態工廠方法', () => {
    it('insufficientStock 應建立庫存不足錯誤 (409)', () => {
      const error = FlashSaleError.insufficientStock(5, 10)

      expect(error.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
      expect(error.httpStatus).toBe(409)
      expect(error.message).toContain('5')
      expect(error.message).toContain('10')
    })

    it('invalidQuantity 應建立無效數量錯誤 (400)', () => {
      const error = FlashSaleError.invalidQuantity(-1)

      expect(error.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      expect(error.httpStatus).toBe(400)
      expect(error.message).toContain('-1')
    })

    it('productInactive 應建立商品未啟用錯誤 (400)', () => {
      const error = FlashSaleError.productInactive('prod-123')

      expect(error.code).toBe(FlashSaleErrorCode.PRODUCT_INACTIVE)
      expect(error.httpStatus).toBe(400)
      expect(error.message).toContain('prod-123')
    })

    it('productNotFound 應建立商品未找到錯誤 (404)', () => {
      const error = FlashSaleError.productNotFound('prod-999')

      expect(error.code).toBe(FlashSaleErrorCode.PRODUCT_NOT_FOUND)
      expect(error.httpStatus).toBe(404)
      expect(error.message).toContain('prod-999')
    })

    it('orderNotFound 應建立訂單未找到錯誤 (404)', () => {
      const error = FlashSaleError.orderNotFound('order-999')

      expect(error.code).toBe(FlashSaleErrorCode.ORDER_NOT_FOUND)
      expect(error.httpStatus).toBe(404)
      expect(error.message).toContain('order-999')
    })

    it('invalidOrderStatus 應建立無效訂單狀態錯誤 (409)', () => {
      const error = FlashSaleError.invalidOrderStatus('PENDING', 'PAID')

      expect(error.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
      expect(error.httpStatus).toBe(409)
      expect(error.message).toContain('PENDING')
      expect(error.message).toContain('PAID')
    })

    it('currencyMismatch 應建立通貨不匹配錯誤 (400)', () => {
      const error = FlashSaleError.currencyMismatch('TWD', 'USD')

      expect(error.code).toBe(FlashSaleErrorCode.CURRENCY_MISMATCH)
      expect(error.httpStatus).toBe(400)
      expect(error.message).toContain('TWD')
      expect(error.message).toContain('USD')
    })

    it('invalidAmount 應建立無效金額錯誤 (400)', () => {
      const error = FlashSaleError.invalidAmount(-100)

      expect(error.code).toBe(FlashSaleErrorCode.INVALID_AMOUNT)
      expect(error.httpStatus).toBe(400)
      expect(error.message).toContain('-100')
    })
  })
})
