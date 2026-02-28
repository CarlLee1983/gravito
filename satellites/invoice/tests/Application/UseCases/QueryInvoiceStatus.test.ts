import { beforeEach, describe, expect, it } from 'bun:test'
import {
  GenerateInvoiceReport,
  QueryInvoiceStatus,
} from '../../../src/Application/UseCases/QueryInvoiceStatus'
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

describe('QueryInvoiceStatus UseCase', () => {
  let useCase: QueryInvoiceStatus
  let repository: MockRepository

  beforeEach(() => {
    repository = new MockRepository()
    useCase = new QueryInvoiceStatus(repository)
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
      const invoiceNumber = InvoiceNumber.generate()
      const amount = InvoiceAmount.create(1000 * (i + 1), 'TWD')
      const tax = InvoiceTax.create(50 * (i + 1), 0.05)
      const invoice = Invoice.create(`order-${i}`, invoiceNumber, amount, tax)
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
    const invoiceNumber1 = InvoiceNumber.generate()
    const amount1 = InvoiceAmount.create(1000, 'TWD')
    const tax1 = InvoiceTax.create(50, 0.05)
    const invoice1 = Invoice.create('order-1', invoiceNumber1, amount1, tax1)
    await repository.save(invoice1)

    const invoiceNumber2 = InvoiceNumber.generate()
    const amount2 = InvoiceAmount.create(2000, 'TWD')
    const tax2 = InvoiceTax.create(100, 0.05)
    const invoice2 = Invoice.create('order-2', invoiceNumber2, amount2, tax2)
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
