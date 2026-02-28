import { describe, expect, it } from 'bun:test'
import {
  DuplicateInvoiceError,
  InvalidAmountError,
  InvalidCancellationError,
  InvalidInvoiceNumberError,
  InvalidTaxError,
  InvalidTransitionError,
  InvoiceError,
  InvoiceNotFoundError,
} from '../../../src/Domain/Errors/InvoiceError'

describe('Invoice Error Classes', () => {
  it('應該正確建立 InvoiceError', () => {
    const error = new InvoiceError('Something went wrong')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('InvoiceError')
    expect(error.message).toBe('Something went wrong')
  })

  it('應該正確建立 DuplicateInvoiceError', () => {
    const error = new DuplicateInvoiceError('order-123')

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('DuplicateInvoiceError')
    expect(error.message).toContain('order-123')
  })

  it('應該正確建立 InvalidAmountError', () => {
    const error = new InvalidAmountError(-100)

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('InvalidAmountError')
    expect(error.message).toContain('-100')
  })

  it('應該正確建立 InvalidTaxError', () => {
    const error = new InvalidTaxError(-50)

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('InvalidTaxError')
    expect(error.message).toContain('-50')
  })

  it('應該正確建立 InvalidTransitionError', () => {
    const error = new InvalidTransitionError('ISSUED', 'INVALID')

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('InvalidTransitionError')
    expect(error.message).toContain('ISSUED')
    expect(error.message).toContain('INVALID')
  })

  it('應該正確建立 InvalidInvoiceNumberError', () => {
    const error = new InvalidInvoiceNumberError('INVALID')

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('InvalidInvoiceNumberError')
    expect(error.message).toContain('INVALID')
  })

  it('應該正確建立 InvoiceNotFoundError', () => {
    const error = new InvoiceNotFoundError('invoice-123')

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('InvoiceNotFoundError')
    expect(error.message).toContain('invoice-123')
  })

  it('應該正確建立 InvalidCancellationError', () => {
    const error = new InvalidCancellationError('CANCELLED')

    expect(error).toBeInstanceOf(InvoiceError)
    expect(error.name).toBe('InvalidCancellationError')
    expect(error.message).toContain('CANCELLED')
  })

  it('應該能夠捕捉所有錯誤類型', () => {
    const errors = [
      new InvoiceError('test'),
      new DuplicateInvoiceError('order'),
      new InvalidAmountError(0),
      new InvalidTaxError(-1),
      new InvalidTransitionError('A', 'B'),
      new InvalidInvoiceNumberError('test'),
      new InvoiceNotFoundError('test'),
      new InvalidCancellationError('status'),
    ]

    for (const error of errors) {
      expect(error).toBeInstanceOf(InvoiceError)
      expect(error).toBeInstanceOf(Error)
    }
  })
})
