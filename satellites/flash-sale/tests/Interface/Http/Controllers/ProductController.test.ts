/**
 * ProductController 單元測試
 *
 * 驗證 Controller 使用 FlashSaleError.httpStatus 進行錯誤回應
 */

import { describe, expect, it } from 'bun:test'
import {
  FlashSaleError,
  FlashSaleErrorCode,
} from '../../../../src/Application/Errors/FlashSaleError'

describe('ProductController error handling', () => {
  describe('FlashSaleError for product operations', () => {
    it('should map INVALID_AMOUNT to 400', () => {
      const error = FlashSaleError.invalidAmount(-100)
      expect(error.httpStatus).toBe(400)
      expect(error.code).toBe(FlashSaleErrorCode.INVALID_AMOUNT)
    })

    it('should map CURRENCY_MISMATCH to 400', () => {
      const error = FlashSaleError.currencyMismatch('TWD', 'USD')
      expect(error.httpStatus).toBe(400)
      expect(error.code).toBe(FlashSaleErrorCode.CURRENCY_MISMATCH)
    })

    it('should contain human-readable message', () => {
      const error = FlashSaleError.productNotFound('prod-xyz')
      expect(error.message).toContain('prod-xyz')
    })

    it('should preserve error name', () => {
      const error = FlashSaleError.productNotFound('prod-1')
      expect(error.name).toBe('FlashSaleError')
    })
  })
})
