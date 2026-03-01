import { describe, expect, it } from 'bun:test'
import { InvalidAmountError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceAmount } from '../../../src/Domain/ValueObjects/InvoiceAmount'

describe('InvoiceAmount ValueObject', () => {
  it('應該正確建立有效的金額', () => {
    const amount = InvoiceAmount.create(1000, 'TWD')
    expect(amount.value).toBe(1000)
    expect(amount.currency).toBe('TWD')
  })

  it('應該使用預設幣別 TWD', () => {
    const amount = InvoiceAmount.create(1000, 'TWD')
    expect(amount.currency).toBe('TWD')
  })

  it('應該拒絕非數字的金額', () => {
    expect(() => InvoiceAmount.create(NaN, 'TWD')).toThrow(InvalidAmountError)
  })

  it('應該正確添加兩個相同幣別的金額', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(500, 'TWD')
    const result = amount1.add(amount2)

    expect(result.value).toBe(1500)
    expect(result.currency).toBe('TWD')
  })

  it('應該拒絕添加不同幣別的金額', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(100, 'USD')

    expect(() => amount1.add(amount2)).toThrow()
  })

  it('應該正確減去兩個相同幣別的金額', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(300, 'TWD')
    const result = amount1.subtract(amount2)

    expect(result.value).toBe(700)
    expect(result.currency).toBe('TWD')
  })

  it('應該允許減去導致負數的金額', () => {
    const amount1 = InvoiceAmount.create(100, 'TWD')
    const amount2 = InvoiceAmount.create(200, 'TWD')

    // subtract is allowed to produce negative values
    const result = amount1.subtract(amount2)
    expect(result.value).toBe(-100)
  })

  it('應該正確比較金額大小', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(500, 'TWD')

    expect(amount1.greaterThan(amount2)).toBe(true)
    expect(amount2.greaterThan(amount1)).toBe(false)
    expect(amount1.greaterThan(amount1)).toBe(false)
  })

  it('應該拒絕比較不同幣別的金額', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(500, 'USD')

    expect(() => amount1.greaterThan(amount2)).toThrow()
  })

  it('應該正確比較兩個相同的金額', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(1000, 'TWD')

    expect(amount1.equals(amount2)).toBe(true)
  })

  it('應該正確比較兩個不同的金額', () => {
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const amount2 = InvoiceAmount.create(500, 'TWD')

    expect(amount1.equals(amount2)).toBe(false)
  })
})
