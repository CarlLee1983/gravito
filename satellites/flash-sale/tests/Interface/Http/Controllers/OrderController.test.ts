/**
 * OrderController 單元測試
 *
 * 驗證 Controller 使用 FlashSaleError.httpStatus 進行錯誤回應
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import {
  FlashSaleError,
  FlashSaleErrorCode,
} from '../../../../src/Application/Errors/FlashSaleError'

describe('OrderController error handling', () => {
  describe('FlashSaleError.httpStatus mapping', () => {
    it('should map PRODUCT_NOT_FOUND to 404', () => {
      const error = FlashSaleError.productNotFound('prod-1')
      expect(error.httpStatus).toBe(404)
      expect(error.code).toBe(FlashSaleErrorCode.PRODUCT_NOT_FOUND)
    })

    it('should map INSUFFICIENT_STOCK to 409', () => {
      const error = FlashSaleError.insufficientStock(5, 10)
      expect(error.httpStatus).toBe(409)
      expect(error.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
    })

    it('should map ORDER_NOT_FOUND to 404', () => {
      const error = FlashSaleError.orderNotFound('order-1')
      expect(error.httpStatus).toBe(404)
      expect(error.code).toBe(FlashSaleErrorCode.ORDER_NOT_FOUND)
    })

    it('should map INVALID_ORDER_STATUS to 409', () => {
      const error = FlashSaleError.invalidOrderStatus('CONFIRMED', 'CONFIRMED')
      expect(error.httpStatus).toBe(409)
      expect(error.code).toBe(FlashSaleErrorCode.INVALID_ORDER_STATUS)
    })

    it('should map INVALID_QUANTITY to 400', () => {
      const error = FlashSaleError.invalidQuantity(-1)
      expect(error.httpStatus).toBe(400)
      expect(error.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
    })

    it('should map PRODUCT_INACTIVE to 400', () => {
      const error = FlashSaleError.productInactive('prod-1')
      expect(error.httpStatus).toBe(400)
      expect(error.code).toBe(FlashSaleErrorCode.PRODUCT_INACTIVE)
    })

    it('should be instanceof Error', () => {
      const error = FlashSaleError.productNotFound('prod-1')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(FlashSaleError)
    })
  })
})
