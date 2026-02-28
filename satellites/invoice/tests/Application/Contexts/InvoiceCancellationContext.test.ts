import { beforeEach, describe, expect, it } from 'bun:test'
import { InvoiceCancellationContext } from '../../../src/Application/Contexts/InvoiceCancellationContext'
import { DefaultInvoiceCanceller } from '../../../src/Application/Roles/InvoiceCancellerRole'
import type { IInvoiceRepository } from '../../../src/Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../../src/Domain/Entities/Invoice'
import {
  InvalidCancellationError,
  InvoiceNotFoundError,
} from '../../../src/Domain/Errors/InvoiceError'
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

describe('InvoiceCancellationContext', () => {
  let context: InvoiceCancellationContext
  let repository: MockRepository
  let canceller: DefaultInvoiceCanceller

  beforeEach(async () => {
    repository = new MockRepository()
    canceller = new DefaultInvoiceCanceller()
    context = new InvoiceCancellationContext(repository, canceller)
  })

  it('應該成功取消已發行的發票', async () => {
    // 先建立一張發票
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

    // 取消發票
    const result = await context.orchestrate({
      invoiceId: 'inv-123',
      reason: 'CUSTOMER_REQUEST',
      notes: 'Customer changed their mind',
    })

    expect(result.id).toBe('inv-123')
    expect(result.invoiceNumber).toBe('GX-12345678')
    expect(result.previousStatus).toBe('ISSUED')
    expect(result.newStatus).toBe('CANCELLED')
    expect(result.cancelledAt).toBeInstanceOf(Date)
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
      const invoiceNumber = InvoiceNumber.generate()
      const amount = InvoiceAmount.create(1000, 'TWD')
      const tax = InvoiceTax.create(50, 0.05)
      const invoice = Invoice.create(`order-${reason}`, invoiceNumber, amount, tax)
      await repository.save(invoice)

      const result = await context.orchestrate({
        invoiceId: invoice.id,
        reason,
      })

      expect(result.previousStatus).toBe('ISSUED')
      expect(result.newStatus).toBe('CANCELLED')
    }
  })

  it('應該在發票不存在時拋出錯誤', async () => {
    try {
      await context.orchestrate({
        invoiceId: 'non-existent',
        reason: 'CUSTOMER_REQUEST',
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceNotFoundError)
    }
  })

  it('應該拒絕取消已取消的發票', async () => {
    // 先建立並取消一張發票
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

    // 嘗試再次取消
    try {
      await context.orchestrate({
        invoiceId: 'inv-123',
        reason: 'CUSTOMER_REQUEST',
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCancellationError)
    }
  })

  it('應該記錄取消的 notes', async () => {
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

    const result = await context.orchestrate({
      invoiceId: 'inv-123',
      reason: 'CUSTOMER_REQUEST',
      notes: 'Special handling requested',
    })

    expect(result.id).toBe('inv-123')
    // 驗證記錄已保存
    const record = (canceller as any).getCancellationRecord('inv-123')
    expect(record.notes).toBe('Special handling requested')
  })

  it('應該更新 Repository 中的發票狀態', async () => {
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

    await context.orchestrate({
      invoiceId: 'inv-123',
      reason: 'CUSTOMER_REQUEST',
    })

    // 驗證已保存的發票狀態已更新
    const updated = await repository.findById('inv-123')
    expect(updated?.status.value).toBe('CANCELLED')
  })

  it('應該能取消沒有 notes 的發票', async () => {
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

    const result = await context.orchestrate({
      invoiceId: 'inv-123',
      reason: 'CUSTOMER_REQUEST',
    })

    expect(result.newStatus).toBe('CANCELLED')
  })
})
