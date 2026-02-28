import { describe, expect, it } from 'bun:test'
import { InvalidTaxError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceTax } from '../../../src/Domain/ValueObjects/InvoiceTax'

describe('InvoiceTax ValueObject', () => {
  it('應該正確建立有效的稅額', () => {
    const tax = InvoiceTax.create(50, 0.05)
    expect(tax.value).toBe(50)
    expect(tax.rate).toBe(0.05)
    expect(tax.toString()).toBe('Tax: 50 (5%)')
  })

  it('應該使用預設稅率 5%', () => {
    const tax = InvoiceTax.create(50)
    expect(tax.rate).toBe(0.05)
  })

  it('應該拒絕負數的稅額', () => {
    expect(() => InvoiceTax.create(-50, 0.05)).toThrow(InvalidTaxError)
  })

  it('應該拒絕無效的稅率（超過 100%）', () => {
    expect(() => InvoiceTax.create(50, 1.5)).toThrow()
  })

  it('應該拒絕無效的稅率（負數）', () => {
    expect(() => InvoiceTax.create(50, -0.05)).toThrow()
  })

  it('應該正確計算稅額', () => {
    const tax = InvoiceTax.calculate(1000, 0.05)
    expect(tax.value).toBe(50)
    expect(tax.rate).toBe(0.05)
  })

  it('應該使用預設稅率計算稅額', () => {
    const tax = InvoiceTax.calculate(1000)
    expect(tax.value).toBe(50)
    expect(tax.rate).toBe(0.05)
  })

  it('應該正確計算稅後金額', () => {
    const tax = InvoiceTax.create(50, 0.05)
    const grossAmount = tax.calculateGrossAmount(1000)
    expect(grossAmount).toBe(1050)
  })

  it('應該允許零稅額', () => {
    const tax = InvoiceTax.create(0, 0)
    expect(tax.value).toBe(0)
    expect(tax.rate).toBe(0)
  })

  it('應該正確比較兩個相同的稅額', () => {
    const tax1 = InvoiceTax.create(50, 0.05)
    const tax2 = InvoiceTax.create(50, 0.05)

    expect(tax1.equals(tax2)).toBe(true)
  })

  it('應該正確比較兩個不同的稅額', () => {
    const tax1 = InvoiceTax.create(50, 0.05)
    const tax2 = InvoiceTax.create(100, 0.1)

    expect(tax1.equals(tax2)).toBe(false)
  })
})
