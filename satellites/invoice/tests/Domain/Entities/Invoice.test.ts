import { describe, expect, it } from 'bun:test'
import { Invoice } from '../../../src/Domain/Entities/Invoice'
import {
  InvalidCancellationError,
  InvalidTransitionError,
} from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceAmount } from '../../../src/Domain/ValueObjects/InvoiceAmount'
import { InvoiceNumber } from '../../../src/Domain/ValueObjects/InvoiceNumber'
import { InvoiceStatus } from '../../../src/Domain/ValueObjects/InvoiceStatus'
import { InvoiceTax } from '../../../src/Domain/ValueObjects/InvoiceTax'

describe('Invoice Entity', () => {
  it('應該正確建立新發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)

    expect(invoice.orderId).toBe('order-123')
    expect(invoice.invoiceNumber.value).toBe('GX-12345678')
    expect(invoice.amount.value).toBe(1000)
    expect(invoice.tax.value).toBe(50)
    expect(invoice.status.value).toBe('ISSUED')
    expect(invoice.isActive()).toBe(true)
  })

  it('應該帶有 buyerIdentifier 和 carrierId 建立發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create(
      'order-123',
      invoiceNumber,
      amount,
      tax,
      'buyer-123',
      'carrier-456'
    )

    expect(invoice.buyerIdentifier).toBe('buyer-123')
    expect(invoice.carrierId).toBe('carrier-456')
  })

  it('應該有自動生成的 ID', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice1 = Invoice.create('order-123', invoiceNumber, amount, tax)
    const invoice2 = Invoice.create('order-456', invoiceNumber, amount, tax)

    expect(invoice1.id).toBeDefined()
    expect(invoice2.id).toBeDefined()
    expect(invoice1.id).not.toBe(invoice2.id)
  })

  it('應該允許指定 ID', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create(
      'order-123',
      invoiceNumber,
      amount,
      tax,
      undefined,
      undefined,
      'custom-id'
    )

    expect(invoice.id).toBe('custom-id')
  })

  it('應該正確取消發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    const cancelledInvoice = invoice.cancel()

    expect(cancelledInvoice.status.value).toBe('CANCELLED')
    expect(cancelledInvoice.isActive()).toBe(false)
  })

  it('應該拒絕取消已取消的發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    const cancelledInvoice = invoice.cancel()

    expect(() => cancelledInvoice.cancel()).toThrow(InvalidCancellationError)
  })

  it('應該正確退貨發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    const returnedInvoice = invoice.return()

    expect(returnedInvoice.status.value).toBe('RETURNED')
    expect(returnedInvoice.isActive()).toBe(false)
  })

  it('應該拒絕退貨已返回的發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    const returnedInvoice = invoice.return()

    expect(() => returnedInvoice.return()).toThrow(InvalidCancellationError)
  })

  it('應該驗證是否為同一發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice1 = Invoice.create(
      'order-123',
      invoiceNumber,
      amount,
      tax,
      undefined,
      undefined,
      'id-1'
    )
    const invoice2 = Invoice.create(
      'order-123',
      invoiceNumber,
      amount,
      tax,
      undefined,
      undefined,
      'id-2'
    )

    expect(invoice1.isSameInvoice(invoice1)).toBe(true)
    expect(invoice1.isSameInvoice(invoice2)).toBe(false)
  })

  it('應該驗證是否為同一訂單', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)

    expect(invoice.isSameOrder('order-123')).toBe(true)
    expect(invoice.isSameOrder('order-456')).toBe(false)
  })

  it('應該正確轉換為快照', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax, 'buyer-123')
    const snapshot = invoice.toSnapshot()

    expect(snapshot.orderId).toBe('order-123')
    expect(snapshot.invoiceNumber).toBe('GX-12345678')
    expect(snapshot.amount).toBe(1000)
    expect(snapshot.amountCurrency).toBe('TWD')
    expect(snapshot.tax).toBe(50)
    expect(snapshot.taxRate).toBe(0.05)
    expect(snapshot.status).toBe('ISSUED')
    expect(snapshot.buyerIdentifier).toBe('buyer-123')
  })

  it('應該從快照恢復發票', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const original = Invoice.create('order-123', invoiceNumber, amount, tax, 'buyer-123')
    const snapshot = original.toSnapshot()

    const restored = Invoice.fromSnapshot(snapshot)

    expect(restored.id).toBe(original.id)
    expect(restored.orderId).toBe(original.orderId)
    expect(restored.invoiceNumber.value).toBe(original.invoiceNumber.value)
    expect(restored.amount.value).toBe(original.amount.value)
    expect(restored.tax.value).toBe(original.tax.value)
    expect(restored.status.value).toBe(original.status.value)
    expect(restored.buyerIdentifier).toBe(original.buyerIdentifier)
  })

  it('應該保持不變性（cancel 返回新物件）', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    const cancelledInvoice = invoice.cancel()

    expect(invoice.id).toBe(cancelledInvoice.id)
    expect(invoice.status.value).toBe('ISSUED')
    expect(cancelledInvoice.status.value).toBe('CANCELLED')
  })

  it('應該保持不變性（return 返回新物件）', () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(1000, 'TWD')
    const tax = InvoiceTax.create(50, 0.05)

    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    const returnedInvoice = invoice.return()

    expect(invoice.id).toBe(returnedInvoice.id)
    expect(invoice.status.value).toBe('ISSUED')
    expect(returnedInvoice.status.value).toBe('RETURNED')
  })
})
