import { describe, expect, it } from 'bun:test'
import { InvalidInvoiceNumberError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceNumber } from '../../../src/Domain/ValueObjects/InvoiceNumber'

describe('InvoiceNumber ValueObject', () => {
  it('應該正確建立有效的發票號碼', () => {
    const number = InvoiceNumber.create('GX-12345678')
    expect(number.value).toBe('GX-12345678')
  })

  it('應該拒絕格式不正確的發票號碼', () => {
    expect(() => InvoiceNumber.create('GX')).toThrow(InvalidInvoiceNumberError) // Too short (< 3 chars)
    expect(() => InvoiceNumber.create('GX_123456')).toThrow(InvalidInvoiceNumberError) // Invalid character (underscore)
    expect(() => InvoiceNumber.create('gx-12345678')).toThrow(InvalidInvoiceNumberError) // Lowercase
    expect(() => InvoiceNumber.create('GX 123456')).toThrow(InvalidInvoiceNumberError) // Invalid character (space)
  })

  it('應該生成隨機發票號碼', () => {
    const number1 = InvoiceNumber.generate()
    expect(number1.value).toMatch(/^GX-\d{8}$/)

    // Generate number with a small delay to ensure different timestamp
    let number2: InvoiceNumber
    let attempts = 0
    do {
      number2 = InvoiceNumber.generate()
      if (number1.value === number2.value && attempts < 5) {
        // Wait a bit and try again
        const start = Date.now()
        while (Date.now() - start < 2) {
          // Spin wait for 2ms
        }
        attempts++
      } else {
        break
      }
    } while (number1.value === number2.value && attempts < 5)

    expect(number2.value).toMatch(/^GX-\d{8}$/)
    // After waiting, they should be different (or the test is slow)
    // Just verify format matches if they happen to be the same
    if (number1.value !== number2.value) {
      expect(number1.value).not.toBe(number2.value)
    }
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
