import { describe, expect, it } from 'bun:test'
import { InvalidInvoiceNumberError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceNumber } from '../../../src/Domain/ValueObjects/InvoiceNumber'

describe('InvoiceNumber ValueObject', () => {
  it('應該正確建立有效的發票號碼', () => {
    const number = InvoiceNumber.create('GX-12345678')
    expect(number.value).toBe('GX-12345678')
    expect(number.toString()).toBe('GX-12345678')
  })

  it('應該拒絕格式不正確的發票號碼', () => {
    expect(() => InvoiceNumber.create('INVALID')).toThrow(InvalidInvoiceNumberError)
    expect(() => InvoiceNumber.create('GX-1234')).toThrow(InvalidInvoiceNumberError)
    expect(() => InvoiceNumber.create('GX-123456789')).toThrow(InvalidInvoiceNumberError)
    expect(() => InvoiceNumber.create('GX-ABCDEFGH')).toThrow(InvalidInvoiceNumberError)
  })

  it('應該生成隨機發票號碼', () => {
    const number1 = InvoiceNumber.generate()
    const number2 = InvoiceNumber.generate()

    expect(number1.value).toMatch(/^GX-\d{8}$/)
    expect(number2.value).toMatch(/^GX-\d{8}$/)
    expect(number1.value).not.toBe(number2.value)
  })

  it('應該正確比較兩個相同的發票號碼', () => {
    const number1 = InvoiceNumber.create('GX-12345678')
    const number2 = InvoiceNumber.create('GX-12345678')

    expect(number1.equals(number2)).toBe(true)
  })

  it('應該正確比較兩個不同的發票號碼', () => {
    const number1 = InvoiceNumber.create('GX-12345678')
    const number2 = InvoiceNumber.create('GX-87654321')

    expect(number1.equals(number2)).toBe(false)
  })
})
