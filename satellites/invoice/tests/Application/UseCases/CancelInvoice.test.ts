import { beforeEach, describe, expect, it } from 'bun:test'
import { CancelInvoice } from '../../../src/Application/UseCases/CancelInvoice'
import type { IInvoiceRepository } from '../../../src/Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../../src/Domain/Entities/Invoice'
import {
  InvalidCancellationError,
  InvoiceNotFoundError,
} from '../../../src/Domain/Errors/InvoiceError'
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

describe('CancelInvoice UseCase', () => {
  let useCase: CancelInvoice
  let repository: MockRepository

  beforeEach(() => {
    repository = new MockRepository()
    useCase = new CancelInvoice(repository)
  })

  it('應該成功取消發票', async () => {
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

    const result = await useCase.execute({
      invoiceId: 'inv-123',
      reason: 'CUSTOMER_REQUEST',
      notes: 'Customer changed their mind',
    })

    expect(result.id).toBe('inv-123')
    expect(result.previousStatus).toBe('ISSUED')
    expect(result.newStatus).toBe('CANCELLED')
  })

  it('應該支援各種取消原因', async () => {
    const reasons = [
      'CUSTOMER_REQUEST',
      'PAYMENT_FAILED',
      'ORDER_CANCELLED',
      'DUPLICATE',
      'OTHER',
    ] as const

    for (const reason of reasons) {
      const invoice = Invoice.create({
        orderId: `order-${reason}`,
        invoiceNumber: InvoiceNumber.generate().value,
        amount: 1000,
        tax: 50,
        status: 'ISSUED',
      })
      await repository.save(invoice)

      const result = await useCase.execute({
        invoiceId: invoice.id,
        reason,
      })

      expect(result.newStatus).toBe('CANCELLED')
    }
  })

  it('應該在發票不存在時拋出錯誤', async () => {
    try {
      await useCase.execute({
        invoiceId: 'non-existent',
        reason: 'CUSTOMER_REQUEST',
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceNotFoundError)
    }
  })

  it('應該拒絕取消已取消的發票', async () => {
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

    try {
      await useCase.execute({
        invoiceId: 'inv-123',
        reason: 'CUSTOMER_REQUEST',
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCancellationError)
    }
  })

  it('應該更新發票狀態在 Repository 中', async () => {
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

    await useCase.execute({
      invoiceId: 'inv-123',
      reason: 'CUSTOMER_REQUEST',
    })

    const updated = await repository.findById('inv-123')
    expect(updated?.status).toBe('CANCELLED')
  })
})
