import { beforeEach, describe, expect, it } from 'bun:test'
import { IssueInvoice } from '../../../src/Application/UseCases/IssueInvoice'
import type { IInvoiceRepository } from '../../../src/Domain/Contracts/IInvoiceRepository'
import type { Invoice } from '../../../src/Domain/Entities/Invoice'
import { DuplicateInvoiceError, InvoiceError } from '../../../src/Domain/Errors/InvoiceError'

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

describe('IssueInvoice UseCase (薄殼委派)', () => {
  let useCase: IssueInvoice
  let repository: MockRepository

  beforeEach(() => {
    repository = new MockRepository()
    useCase = new IssueInvoice(repository)
  })

  it('應該成功開立發票', async () => {
    const result = await useCase.execute({
      orderId: 'order-123',
      amount: 1000,
    })

    expect(result.id).toBeDefined()
    expect(result.orderId).toBe('order-123')
    expect(result.invoiceNumber.value).toMatch(/^GX-\d{8}$/)
    expect(result.amount.value).toBe(1000)
    expect(result.status.value).toBe('ISSUED')
  })

  it('應該帶著買方和運送商識別碼開立發票', async () => {
    const result = await useCase.execute({
      orderId: 'order-123',
      amount: 1000,
      buyerIdentifier: 'buyer-123',
      carrierId: 'carrier-456',
    })

    expect(result.buyerIdentifier).toBe('buyer-123')
    expect(result.carrierId).toBe('carrier-456')
  })

  it('應該保存發票到 Repository', async () => {
    const result = await useCase.execute({
      orderId: 'order-123',
      amount: 1000,
    })

    const saved = await repository.findById(result.id)
    expect(saved).toBeDefined()
    expect(saved?.orderId).toBe('order-123')
  })

  it('應該拒絕重複的訂單 ID', async () => {
    // 第一次開票成功
    await useCase.execute({
      orderId: 'order-123',
      amount: 1000,
    })

    // 第二次應該失敗
    try {
      await useCase.execute({
        orderId: 'order-123',
        amount: 1000,
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateInvoiceError)
    }
  })

  it('應該在無效的訂單時拋出錯誤', async () => {
    try {
      await useCase.execute({
        orderId: '',
        amount: 1000,
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceError)
    }
  })

  it('應該計算正確的稅額（5%）', async () => {
    const result = await useCase.execute({
      orderId: 'order-123',
      amount: 1000,
    })

    expect(result.tax.value).toBe(50)
    expect(result.tax.rate).toBe(0.05)
  })

  it('應該生成不同的發票號碼', async () => {
    const result1 = await useCase.execute({
      orderId: 'order-1',
      amount: 1000,
    })

    const result2 = await useCase.execute({
      orderId: 'order-2',
      amount: 1000,
    })

    expect(result1.invoiceNumber.value).not.toBe(result2.invoiceNumber.value)
  })

  it('應該通過 Context 委派進行完整流程', async () => {
    const result = await useCase.execute({
      orderId: 'order-123',
      amount: 1000,
      buyerIdentifier: 'buyer-123',
    })

    // 驗證委派流程正常工作
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.invoiceNumber).toBeDefined()

    // 驗證發票已保存
    const saved = await repository.findById(result.id)
    expect(saved).toBeDefined()
    expect(saved?.buyerIdentifier).toBe('buyer-123')
  })
})
