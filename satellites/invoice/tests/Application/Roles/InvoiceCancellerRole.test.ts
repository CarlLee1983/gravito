import { describe, expect, it } from 'bun:test'
import {
  DefaultInvoiceCanceller,
  injectInvoiceCanceller,
} from '../../../src/Application/Roles/InvoiceCancellerRole'
import { Invoice } from '../../../src/Domain/Entities/Invoice'

describe('InvoiceCancellerRole', () => {
  it('應該驗證 ISSUED 狀態的發票可被取消', () => {
    const canceller = new DefaultInvoiceCanceller()
    const invoice = Invoice.create({
      orderId: 'order-123',
      invoiceNumber: 'GX-12345678',
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })

    const canCancel = canceller.validateCancellationEligibility(invoice)

    expect(canCancel).toBe(true)
  })

  it('應該驗證 CANCELLED 狀態的發票不可被取消', () => {
    const canceller = new DefaultInvoiceCanceller()
    const invoice = Invoice.create({
      orderId: 'order-123',
      invoiceNumber: 'GX-12345678',
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })
    const cancelledInvoice = invoice.cancel()

    const canCancel = canceller.validateCancellationEligibility(cancelledInvoice)

    expect(canCancel).toBe(false)
  })

  it('應該記錄取消原因', () => {
    const canceller = new DefaultInvoiceCanceller()
    const record = canceller.recordCancellationReason(
      'invoice-123',
      'CUSTOMER_REQUEST',
      'Customer changed mind'
    )

    expect(record.invoiceId).toBe('invoice-123')
    expect(record.reason).toBe('CUSTOMER_REQUEST')
    expect(record.notes).toBe('Customer changed mind')
    expect(record.timestamp).toBeInstanceOf(Date)
  })

  it('應該支援各種取消原因', () => {
    const canceller = new DefaultInvoiceCanceller()
    const reasons = [
      'CUSTOMER_REQUEST',
      'PAYMENT_FAILED',
      'ORDER_CANCELLED',
      'DUPLICATE',
      'OTHER',
    ] as const

    for (const reason of reasons) {
      const record = canceller.recordCancellationReason('invoice-123', reason)
      expect(record.reason).toBe(reason)
    }
  })

  it('應該取得已記錄的取消記錄', () => {
    const canceller = new DefaultInvoiceCanceller()
    canceller.recordCancellationReason('invoice-123', 'CUSTOMER_REQUEST')

    const record = (canceller as any).getCancellationRecord('invoice-123')

    expect(record).toBeDefined()
    expect(record.invoiceId).toBe('invoice-123')
    expect(record.reason).toBe('CUSTOMER_REQUEST')
  })

  it('應該在沒有取消記錄時通知服務時拋出錯誤', async () => {
    const canceller = new DefaultInvoiceCanceller()

    try {
      await canceller.notifyRelatedServices('invoice-123')
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect((error as Error).message).toContain('No cancellation record found')
    }
  })

  it('應該能在已記錄後通知相關服務', async () => {
    const canceller = new DefaultInvoiceCanceller()
    canceller.recordCancellationReason('invoice-123', 'CUSTOMER_REQUEST')

    // 應該不拋出錯誤
    await canceller.notifyRelatedServices('invoice-123')
    expect(true).toBe(true)
  })

  it('應該能透過注入函式取得角色', () => {
    const canceller = injectInvoiceCanceller()

    expect(canceller).toBeDefined()
    expect(canceller.validateCancellationEligibility).toBeDefined()
    expect(canceller.recordCancellationReason).toBeDefined()
    expect(canceller.notifyRelatedServices).toBeDefined()
  })
})
