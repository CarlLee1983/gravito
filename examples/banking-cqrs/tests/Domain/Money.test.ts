import { describe, expect, it } from 'bun:test'

describe('Money ValueObject', async () => {
  const { Money } = await import('../../src/Domain/Shared/Money')
  it('應該正確建立金額（分為單位）', () => {
    const money = new Money(10000, 'TWD')
    expect(money.cents).toBe(10000)
    expect(money.dollars).toBe(100)
    expect(money.currency).toBe('TWD')
  })

  it('應該從 dollars 建立金額', () => {
    const money = Money.fromDollars(100, 'TWD')
    expect(money.cents).toBe(10000)
    expect(money.dollars).toBe(100)
  })

  it('應該能相加', () => {
    const money1 = new Money(10000, 'TWD')
    const money2 = new Money(5000, 'TWD')
    const result = money1.add(money2)
    expect(result.cents).toBe(15000)
  })

  it('應該能相減', () => {
    const money1 = new Money(10000, 'TWD')
    const money2 = new Money(3000, 'TWD')
    const result = money1.subtract(money2)
    expect(result.cents).toBe(7000)
  })

  it('應該拒絕負數相減', () => {
    const money1 = new Money(5000, 'TWD')
    const money2 = new Money(10000, 'TWD')
    expect(() => money1.subtract(money2)).toThrow('餘額不足')
  })

  it('應該拒絕不同貨幣混合操作', () => {
    const twdMoney = new Money(10000, 'TWD')
    const usdMoney = new Money(10000, 'USD')
    expect(() => twdMoney.add(usdMoney)).toThrow()
  })

  it('應該能比較大小', () => {
    const money1 = new Money(10000, 'TWD')
    const money2 = new Money(5000, 'TWD')
    expect(money1.isGreaterThan(money2)).toBe(true)
    expect(money2.isLessThan(money1)).toBe(true)
  })

  it('應該拒絕負數金額', () => {
    expect(() => new Money(-100, 'TWD')).toThrow()
  })
})
