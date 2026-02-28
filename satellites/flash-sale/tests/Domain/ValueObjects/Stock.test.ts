import { describe, expect, it } from 'bun:test'
import { FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { Stock } from '../../../src/Domain/ValueObjects/Stock'

describe('Stock', () => {
  describe('of (靜態工廠方法)', () => {
    it('應以正整數建立 Stock', () => {
      const stock = Stock.of(100)

      expect(stock.quantity).toBe(100)
    })

    it('應接受零庫存', () => {
      const stock = Stock.of(0)

      expect(stock.quantity).toBe(0)
    })

    it('應拒絕負數', () => {
      expect(() => Stock.of(-1)).toThrow()
    })

    it('應拒絕小數', () => {
      expect(() => Stock.of(1.5)).toThrow()
    })
  })

  describe('isAvailable', () => {
    it('庫存大於零時應返回 true', () => {
      const stock = Stock.of(10)

      expect(stock.isAvailable).toBe(true)
    })

    it('庫存為零時應返回 false', () => {
      const stock = Stock.of(0)

      expect(stock.isAvailable).toBe(false)
    })
  })

  describe('isEnoughFor', () => {
    it('庫存足夠時應返回 true', () => {
      const stock = Stock.of(10)

      expect(stock.isEnoughFor(5)).toBe(true)
      expect(stock.isEnoughFor(10)).toBe(true)
    })

    it('庫存不足時應返回 false', () => {
      const stock = Stock.of(5)

      expect(stock.isEnoughFor(10)).toBe(false)
    })

    it('零庫存不足以滿足任何需求', () => {
      const stock = Stock.of(0)

      expect(stock.isEnoughFor(1)).toBe(false)
    })
  })

  describe('deduct', () => {
    it('應正確扣減庫存並返回新實例', () => {
      const stock = Stock.of(10)
      const result = stock.deduct(3)

      expect(result.quantity).toBe(7)
      expect(stock.quantity).toBe(10) // 原實例不變
      expect(result).not.toBe(stock) // 新實例
    })

    it('應允許扣減至零', () => {
      const stock = Stock.of(5)
      const result = stock.deduct(5)

      expect(result.quantity).toBe(0)
    })

    it('庫存不足時應拋出 INSUFFICIENT_STOCK 錯誤', () => {
      const stock = Stock.of(3)

      try {
        stock.deduct(5)
        expect(true).toBe(false) // 不應該到這裡
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INSUFFICIENT_STOCK)
      }
    })

    it('應拒絕負數扣減', () => {
      const stock = Stock.of(10)

      try {
        stock.deduct(-1)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })

    it('應拒絕零扣減', () => {
      const stock = Stock.of(10)

      try {
        stock.deduct(0)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })
  })

  describe('add', () => {
    it('應正確補充庫存並返回新實例', () => {
      const stock = Stock.of(10)
      const result = stock.add(5)

      expect(result.quantity).toBe(15)
      expect(stock.quantity).toBe(10) // 原實例不變
      expect(result).not.toBe(stock) // 新實例
    })

    it('應拒絕負數補充', () => {
      const stock = Stock.of(10)

      try {
        stock.add(-1)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })

    it('應拒絕零補充', () => {
      const stock = Stock.of(10)

      try {
        stock.add(0)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.INVALID_QUANTITY)
      }
    })
  })

  describe('equals (ValueObject)', () => {
    it('相同數量應相等', () => {
      const a = Stock.of(10)
      const b = Stock.of(10)

      expect(a.equals(b)).toBe(true)
    })

    it('不同數量應不相等', () => {
      const a = Stock.of(10)
      const b = Stock.of(20)

      expect(a.equals(b)).toBe(false)
    })
  })
})
