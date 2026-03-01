import { beforeEach, describe, expect, it } from 'bun:test'
import {
  GenerateInvoiceReport,
  QueryInvoiceStatus,
} from '../../../src/Application/UseCases/QueryInvoiceStatus'
import type { IInvoiceRepository } from '../../../src/Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../../src/Domain/Entities/Invoice'
import { InvoiceNotFoundError } from '../../../src/Domain/Errors/InvoiceError'
import { InvoiceNumber } from '../../../src/Domain/ValueObjects/InvoiceNumber'

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

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.invoiceNumber === invoiceNumber) {
        return invoice
      }
    }
    return null
  }

  async findByStatus(status: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter((inv) => inv.status === status)
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.createdAt >= startDate && inv.createdAt <= endDate
    )
  }
}

describe('QueryInvoiceStatus UseCase', () => {
  let useCase: QueryInvoiceStatus
  let repository: MockRepository

  beforeEach(() => {
    repository = new MockRepository()
    useCase = new QueryInvoiceStatus(repository)
  })

  it('應該查詢發票狀態', async () => {
    const invoice = Invoice.create(
      {
        orderId: 'order-123',
        invoiceNumber: 'GX-12345678',
        amount: 1000,
        tax: 50,
        status: 'ISSUED',
      },
      'inv-123'
    )
    await repository.save(invoice)

    const result = await useCase.execute({ invoiceId: 'inv-123' })

    expect(result.id).toBe('inv-123')
    expect(result.invoiceNumber).toBe('GX-12345678')
    expect(result.orderId).toBe('order-123')
    expect(result.status).toBe('ISSUED')
    expect(result.amount).toBe(1000)
  })

  it('應該在發票不存在時拋出錯誤', async () => {
    try {
      await useCase.execute({ invoiceId: 'non-existent' })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceNotFoundError)
    }
  })

  it('應該查詢取消的發票狀態', async () => {
    const invoice = Invoice.create(
      {
        orderId: 'order-123',
        invoiceNumber: 'GX-12345678',
        amount: 1000,
        tax: 50,
        status: 'ISSUED',
      },
      'inv-123'
    )
    const cancelledInvoice = invoice.cancel()
    await repository.save(cancelledInvoice)

    const result = await useCase.execute({ invoiceId: 'inv-123' })

    expect(result.status).toBe('CANCELLED')
  })
})

describe('GenerateInvoiceReport UseCase', () => {
  let useCase: GenerateInvoiceReport
  let repository: MockRepository

  beforeEach(() => {
    repository = new MockRepository()
    useCase = new GenerateInvoiceReport(repository)
  })

  it('應該生成發票報告', async () => {
    // 建立多張發票
    for (let i = 0; i < 3; i++) {
      const invoice = Invoice.create({
        orderId: `order-${i}`,
        invoiceNumber: InvoiceNumber.generate().value,
        amount: 1000 * (i + 1),
        tax: 50 * (i + 1),
        status: 'ISSUED',
      })
      await repository.save(invoice)
    }

    const now = new Date()
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const report = await useCase.execute({ startDate, endDate })

    expect(report.summary.total).toBe(3)
    expect(report.summary.issued).toBe(3)
    expect(report.summary.cancelled).toBe(0)
    expect(report.summary.returned).toBe(0)
    expect(report.invoices.length).toBe(3)
  })

  it('應該在空期間返回空報告', async () => {
    const startDate = new Date('2020-01-01')
    const endDate = new Date('2020-12-31')

    const report = await useCase.execute({ startDate, endDate })

    expect(report.summary.total).toBe(0)
    expect(report.invoices.length).toBe(0)
  })

  it('應該統計已取消的發票', async () => {
    const invoice1 = Invoice.create({
      orderId: 'order-1',
      invoiceNumber: InvoiceNumber.generate().value,
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })
    await repository.save(invoice1)

    const invoice2 = Invoice.create({
      orderId: 'order-2',
      invoiceNumber: InvoiceNumber.generate().value,
      amount: 2000,
      tax: 100,
      status: 'ISSUED',
    })
    const cancelledInvoice2 = invoice2.cancel()
    await repository.save(cancelledInvoice2)

    const now = new Date()
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const report = await useCase.execute({ startDate, endDate })

    expect(report.summary.total).toBe(2)
    expect(report.summary.issued).toBe(1)
    expect(report.summary.cancelled).toBe(1)
  })
})
