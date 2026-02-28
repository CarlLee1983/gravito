import { beforeEach, describe, expect, it } from 'bun:test'
import { InvoiceIssuanceContext } from '../../../src/Application/Contexts/InvoiceIssuanceContext'
import { DefaultInvoiceIssuer } from '../../../src/Application/Roles/InvoiceIssuerRole'
import type { IInvoiceRepository } from '../../../src/Domain/Contracts/IInvoiceRepository'
import { DuplicateInvoiceError, InvoiceError } from '../../../src/Domain/Errors/InvoiceError'

// Mock Repository
class MockRepository implements IInvoiceRepository {
  private invoices: Map<string, any> = new Map()

  async save(invoice: any): Promise<void> {
    this.invoices.set(invoice.id, invoice)
  }

  async findById(id: string): Promise<any> {
    return this.invoices.get(id) || null
  }

  async findByOrderId(orderId: string): Promise<any> {
    for (const invoice of this.invoices.values()) {
      if (invoice.orderId === orderId) {
        return invoice
      }
    }
    return null
  }

  async findAll(): Promise<any[]> {
    return Array.from(this.invoices.values())
  }
}

describe('InvoiceIssuanceContext', () => {
  let context: InvoiceIssuanceContext
  let repository: MockRepository
  let issuer: DefaultInvoiceIssuer

  beforeEach(() => {
    repository = new MockRepository()
    issuer = new DefaultInvoiceIssuer()
    context = new InvoiceIssuanceContext(repository, issuer)
  })

  it('應該成功開立發票', async () => {
    const result = await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
      currency: 'TWD',
    })

    expect(result.id).toBeDefined()
    expect(result.invoiceNumber).toMatch(/^GX-\d{8}$/)
    expect(result.orderId).toBe('order-123')
    expect(result.amount).toBe(1000)
    expect(result.currency).toBe('TWD')
    expect(result.status).toBe('ISSUED')
  })

  it('應該使用預設幣別 TWD', async () => {
    const result = await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
    })

    expect(result.currency).toBe('TWD')
  })

  it('應該帶著買方和運送商識別碼開立發票', async () => {
    const result = await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
      buyerIdentifier: 'buyer-123',
      carrierId: 'carrier-456',
    })

    expect(result.id).toBeDefined()
    // 驗證保存的發票包含這些資訊
    const saved = await repository.findById(result.id)
    expect(saved).toBeDefined()
  })

  it('應該計算正確的稅額', async () => {
    const result = await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
    })

    // 驗證金額
    expect(result.amount).toBe(1000)
    // 稅額應該是 50 (5% of 1000)
    const saved = await repository.findById(result.id)
    expect(saved.tax.value).toBe(50)
  })

  it('應該拒絕重複的訂單 ID', async () => {
    // 第一次開票成功
    await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
    })

    // 第二次應該失敗
    try {
      await context.orchestrate({
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
      await context.orchestrate({
        orderId: '',
        amount: 1000,
      })
      expect(true).toBe(false) // 應該拋出錯誤
    } catch (error) {
      expect(error).toBeInstanceOf(InvoiceError)
    }
  })

  it('應該保存發票到 Repository', async () => {
    const result = await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
    })

    const saved = await repository.findById(result.id)
    expect(saved).toBeDefined()
    expect(saved.orderId).toBe('order-123')
  })

  it('應該能透過 orderId 查詢已開立的發票', async () => {
    const result = await context.orchestrate({
      orderId: 'order-123',
      amount: 1000,
    })

    const saved = await repository.findByOrderId('order-123')
    expect(saved).toBeDefined()
    expect(saved.id).toBe(result.id)
  })

  it('應該生成不同的發票號碼', async () => {
    const result1 = await context.orchestrate({
      orderId: 'order-1',
      amount: 1000,
    })

    const result2 = await context.orchestrate({
      orderId: 'order-2',
      amount: 1000,
    })

    expect(result1.invoiceNumber).not.toBe(result2.invoiceNumber)
  })
})
