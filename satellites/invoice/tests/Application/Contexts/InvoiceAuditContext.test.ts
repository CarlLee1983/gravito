import { beforeEach, describe, expect, it } from 'bun:test'
import { InvoiceAuditContext } from '../../../src/Application/Contexts/InvoiceAuditContext'
import { DefaultInvoiceTracker } from '../../../src/Application/Roles/InvoiceTrackerRole'
import type { IInvoiceRepository } from '../../../src/Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../../src/Domain/Entities/Invoice'
import { InvoiceNotFoundError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceAmount } from '../../../src/Domain/ValueObjects/InvoiceAmount'
import { InvoiceNumber } from '../../../src/Domain/ValueObjects/InvoiceNumber'
import { InvoiceTax } from '../../../src/Domain/ValueObjects/InvoiceTax'

// Mock Repository
class MockRepository implements IInvoiceRepository {
  private invoices: Map<string, Invoice> = new Map()

  async save(invoice: Invoice): Promise<void> {
    this.invoices.set(invoice.id, invoice)
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) || null
  }

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.orderId === orderId) {
        return invoice
      }
    }
    return null
  }

  async findAll(): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
  }
}

describe('InvoiceAuditContext', () => {
  let context: InvoiceAuditContext
  let repository: MockRepository
  let tracker: DefaultInvoiceTracker

  beforeEach(async () => {
    repository = new MockRepository()
    tracker = new DefaultInvoiceTracker()
    context = new InvoiceAuditContext(repository, tracker)
  })

  it('應該查詢發票狀態', async () => {
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
      'inv-123'
    )
    await repository.save(invoice)
    tracker.trackInvoice(invoice)

    const result = await context.queryStatus({ invoiceId: 'inv-123' })

    expect(result.id).toBe('inv-123')
    expect(result.invoiceNumber).toBe('GX-12345678')
    expect(result.orderId).toBe('order-123')
    expect(result.status).toBe('ISSUED')
    expect(result.amount).toBe(1000)
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('應該在發票不存在時拋出錯誤', async () => {
    try {
      await context.queryStatus({ invoiceId: 'non-existent' })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceNotFoundError)
    }
  })

  it('應該取得審計追蹤', async () => {
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
      'inv-123'
    )
    await repository.save(invoice)
    tracker.trackInvoice(invoice)

    tracker.recordAuditLog({
      invoiceId: 'inv-123',
      action: 'CREATED',
      timestamp: new Date(),
      details: { amount: 1000 },
    })

    const result = await context.getAuditTrail({ invoiceId: 'inv-123' })

    expect(result.invoiceId).toBe('inv-123')
    expect(result.logs.length).toBe(1)
    expect((result.logs[0] as any).action).toBe('CREATED')
  })

  it('應該在發票不存在時取得審計追蹤時拋出錯誤', async () => {
    try {
      await context.getAuditTrail({ invoiceId: 'non-existent' })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceNotFoundError)
    }
  })

  it('應該生成期間報告', async () => {
    // 建立多張發票
    for (let i = 0; i < 3; i++) {
      const invoiceNumber = InvoiceNumber.generate()
      const amount = InvoiceAmount.create(1000 * (i + 1), 'TWD')
      const tax = InvoiceTax.create(50 * (i + 1), 0.05)
      const invoice = Invoice.create(`order-${i}`, invoiceNumber, amount, tax)
      await repository.save(invoice)
      tracker.trackInvoice(invoice)
    }

    const now = new Date()
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const report = await context.generateReport({ startDate, endDate })

    expect(report.period.startDate).toEqual(startDate)
    expect(report.period.endDate).toEqual(endDate)
    expect(report.summary.total).toBe(3)
    expect(report.summary.issued).toBe(3)
    expect(report.summary.cancelled).toBe(0)
    expect(report.summary.returned).toBe(0)
    expect(report.summary.totalAmount).toBe(6000) // 1000 + 2000 + 3000
    expect(report.invoices.length).toBe(3)
  })

  it('應該在空期間返回空報告', async () => {
    const startDate = new Date('2020-01-01')
    const endDate = new Date('2020-12-31')

    const report = await context.generateReport({ startDate, endDate })

    expect(report.summary.total).toBe(0)
    expect(report.invoices.length).toBe(0)
  })

  it('應該在報告中包含正確的發票詳情', async () => {
    const invoiceNumber = InvoiceNumber.create('GX-12345678')
    const amount = InvoiceAmount.create(5000, 'TWD')
    const tax = InvoiceTax.create(250, 0.05)
    const invoice = Invoice.create('order-123', invoiceNumber, amount, tax)
    await repository.save(invoice)
    tracker.trackInvoice(invoice)

    const now = new Date()
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const report = await context.generateReport({ startDate, endDate })

    expect(report.invoices[0].id).toBe(invoice.id)
    expect(report.invoices[0].number).toBe('GX-12345678')
    expect(report.invoices[0].orderId).toBe('order-123')
    expect(report.invoices[0].amount).toBe(5000)
    expect(report.invoices[0].status).toBe('ISSUED')
  })
})
