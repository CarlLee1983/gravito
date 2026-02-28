import { describe, expect, it } from 'bun:test'
import { FlashSaleErrorCode } from '../../../src/Application/Errors/FlashSaleError'
import { Money } from '../../../src/Domain/ValueObjects/Money'

describe('Money', () => {
  describe('of (靜態工廠方法)', () => {
    it('應以預設通貨 TWD 建立 Money', () => {
      const money = Money.of(99.99)

      expect(money.value).toBe(99.99)
      expect(money.currency).toBe('TWD')
    })

    it('應以指定通貨建立 Money', () => {
      const money = Money.of(50, 'USD')

      expect(money.value).toBe(50)
      expect(money.currency).toBe('USD')
    })

    it('應以整數建立 Money', () => {
      const money = Money.of(100)

      expect(money.value).toBe(100)
      expect(money.amountInCents).toBe(10000)
    })

    it('應拒絕負數金額', () => {
      expect(() => Money.of(-1)).toThrow()
    })

    it('應接受零金額', () => {
      const money = Money.of(0)

      expect(money.value).toBe(0)
      expect(money.amountInCents).toBe(0)
    })
  })

  describe('amountInCents', () => {
    it('應返回整數分', () => {
      const money = Money.of(99.99)

      expect(money.amountInCents).toBe(9999)
    })

    it('應正確處理整數金額', () => {
      const money = Money.of(100)

      expect(money.amountInCents).toBe(10000)
    })

    it('應正確處理零', () => {
      const money = Money.of(0)

      expect(money.amountInCents).toBe(0)
    })
  })

  describe('add', () => {
    it('應正確相加兩個相同通貨的 Money', () => {
      const a = Money.of(10.5)
      const b = Money.of(20.3)
      const result = a.add(b)

      expect(result.value).toBeCloseTo(30.8, 2)
      expect(result.currency).toBe('TWD')
    })

    it('加法應返回新實例（immutable）', () => {
      const a = Money.of(10)
      const b = Money.of(20)
      const result = a.add(b)

      expect(result).not.toBe(a)
      expect(result).not.toBe(b)
      expect(a.value).toBe(10)
      expect(b.value).toBe(20)
    })

    it('不同通貨相加應拋出 CURRENCY_MISMATCH 錯誤', () => {
      const twd = Money.of(100, 'TWD')
      const usd = Money.of(10, 'USD')

      try {
        twd.add(usd)
        expect(true).toBe(false) // 不應該到這裡
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.CURRENCY_MISMATCH)
      }
    })
  })

  describe('multiply', () => {
    it('應正確乘以整數', () => {
      const money = Money.of(10)
      const result = money.multiply(3)

      expect(result.value).toBe(30)
      expect(result.currency).toBe('TWD')
    })

    it('應正確乘以小數', () => {
      const money = Money.of(100)
      const result = money.multiply(0.5)

      expect(result.value).toBeCloseTo(50, 2)
    })

    it('乘法應返回新實例（immutable）', () => {
      const money = Money.of(10)
      const result = money.multiply(2)

      expect(result).not.toBe(money)
      expect(money.value).toBe(10)
    })

    it('應拒絕負數乘數', () => {
      const money = Money.of(100)

      expect(() => money.multiply(-1)).toThrow()
    })
  })

  describe('isGreaterThan', () => {
    it('金額較大時應返回 true', () => {
      const a = Money.of(100)
      const b = Money.of(50)

      expect(a.isGreaterThan(b)).toBe(true)
    })

    it('金額較小時應返回 false', () => {
      const a = Money.of(50)
      const b = Money.of(100)

      expect(a.isGreaterThan(b)).toBe(false)
    })

    it('金額相等時應返回 false', () => {
      const a = Money.of(100)
      const b = Money.of(100)

      expect(a.isGreaterThan(b)).toBe(false)
    })

    it('不同通貨比較應拋出 CURRENCY_MISMATCH 錯誤', () => {
      const twd = Money.of(100, 'TWD')
      const usd = Money.of(10, 'USD')

      try {
        twd.isGreaterThan(usd)
        expect(true).toBe(false)
      } catch (error: unknown) {
        const flashError = error as { code: string }
        expect(flashError.code).toBe(FlashSaleErrorCode.CURRENCY_MISMATCH)
      }
    })
  })

  describe('equals (ValueObject)', () => {
    it('相同金額和通貨應相等', () => {
      const a = Money.of(100, 'TWD')
      const b = Money.of(100, 'TWD')

      expect(a.equals(b)).toBe(true)
    })

    it('不同金額應不相等', () => {
      const a = Money.of(100, 'TWD')
      const b = Money.of(200, 'TWD')

      expect(a.equals(b)).toBe(false)
    })

    it('不同通貨應不相等', () => {
      const a = Money.of(100, 'TWD')
      const b = Money.of(100, 'USD')

      expect(a.equals(b)).toBe(false)
    })
  })
})
