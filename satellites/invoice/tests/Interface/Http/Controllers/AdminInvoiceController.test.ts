import { beforeEach, describe, expect, it } from 'bun:test'
import { Invoice } from '../../../../src/Domain/Entities/Invoice'
import { InvoiceAmount } from '../../../../src/Domain/ValueObjects/InvoiceAmount'
import { InvoiceNumber } from '../../../../src/Domain/ValueObjects/InvoiceNumber'
import { InvoiceTax } from '../../../../src/Domain/ValueObjects/InvoiceTax'
import { AdminInvoiceController } from '../../../../src/Interface/Http/Controllers/AdminInvoiceController'

// Mock PlanetCore
class MockCore {
  logger = {
    info: (msg: string) => console.log(msg),
    error: (msg: string) => console.error(msg),
  }

  container = {
    make: (key: string) => {
      if (key === 'invoice.repository') {
        return new MockRepository()
      }
      if (key === 'invoice.usecase.issue') {
        return new MockIssueUseCase(new MockRepository())
      }
      if (key === 'invoice.usecase.cancel') {
        return new MockCancelUseCase(new MockRepository())
      }
      if (key === 'invoice.usecase.query') {
        return new MockQueryUseCase(new MockRepository())
      }
      if (key === 'invoice.usecase.report') {
        return new MockReportUseCase(new MockRepository())
      }
      return null
    },
  }
}

// Mock Repository
class MockRepository {
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

// Mock UseCase
class MockIssueUseCase {
  constructor(private repository: MockRepository) {}

  async execute(input: any) {
    const invoice = Invoice.create({
      orderId: input.orderId,
      invoiceNumber: InvoiceNumber.generate().value,
      amount: input.amount,
      tax: input.amount * 0.05,
      status: 'ISSUED',
    })
    await this.repository.save(invoice)
    return invoice
  }
}

class MockCancelUseCase {
  constructor(private repository: MockRepository) {}

  async execute(input: any) {
    const invoice = await this.repository.findById(input.invoiceId)
    if (!invoice) {
      throw new Error(`Invoice with id ${input.invoiceId} not found`)
    }
    const cancelled = invoice.cancel()
    await this.repository.save(cancelled)
    return {
      id: cancelled.id,
      invoiceNumber: cancelled.invoiceNumber,
      previousStatus: 'ISSUED',
      newStatus: 'CANCELLED',
      cancelledAt: new Date(),
    }
  }
}

class MockQueryUseCase {
  constructor(private repository: MockRepository) {}

  async execute(input: any) {
    const invoice = await this.repository.findById(input.invoiceId)
    if (!invoice) {
      throw new Error(`Invoice with id ${input.invoiceId} not found`)
    }
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      status: invoice.status,
      amount: invoice.amount,
      createdAt: invoice.createdAt,
    }
  }
}

class MockReportUseCase {
  constructor(private repository: MockRepository) {}

  async execute(input: any) {
    const invoices = await this.repository.findAll()
    const inRange = invoices.filter((inv) => {
      return inv.createdAt >= input.startDate && inv.createdAt <= input.endDate
    })
    return {
      period: { startDate: input.startDate, endDate: input.endDate },
      summary: {
        total: inRange.length,
        issued: inRange.filter((inv) => inv.statusObject.isIssued()).length,
        cancelled: inRange.filter((inv) => inv.statusObject.isCancelled()).length,
        returned: inRange.filter((inv) => inv.statusObject.isReturned()).length,
        totalAmount: inRange.reduce((sum, inv) => sum + inv.amount, 0),
      },
      invoices: inRange.map((inv) => ({
        id: inv.id,
        number: inv.invoiceNumber,
        orderId: inv.orderId,
        amount: inv.amount,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    }
  }
}

// Mock Context
class MockContext {
  private body: any = {}
  private params: Map<string, string> = new Map()
  private queryParams: Map<string, string> = new Map()
  private responseData: any = null
  private responseStatus = 200
  req: any

  constructor() {
    this.req = {
      json: async () => this.body,
    }
  }

  param(key: string): string | undefined {
    return this.params.get(key)
  }

  query(key: string): string | undefined {
    return this.queryParams.get(key)
  }

  json(data: any, status = 200): any {
    this.responseData = data
    this.responseStatus = status
    return data
  }

  setBody(body: any) {
    this.body = body
  }

  setParam(key: string, value: string) {
    this.params.set(key, value)
  }

  setQuery(key: string, value: string) {
    this.queryParams.set(key, value)
  }

  getResponse() {
    return { data: this.responseData, status: this.responseStatus }
  }
}

describe('AdminInvoiceController', () => {
  let controller: AdminInvoiceController
  let core: MockCore

  beforeEach(() => {
    core = new MockCore() as any
    controller = new AdminInvoiceController(core as any)
  })

  it('應該列出所有發票', async () => {
    const ctx = new MockContext()
    const mockRepo = new MockRepository()

    // 建立測試發票
    const invoice = Invoice.create({
      orderId: 'order-1',
      invoiceNumber: InvoiceNumber.generate().value,
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })
    await mockRepo.save(invoice)

    const response = await controller.index(ctx as any)

    expect(response.success).toBe(true)
    expect(response.data).toBeDefined()
    expect(response.meta.total).toBeGreaterThanOrEqual(0)
  })

  it('應該驗證開立發票的必要欄位', async () => {
    const ctx = new MockContext()
    ctx.setBody({ orderId: 'order-1' }) // 缺少 amount

    const response = await controller.store(ctx as any)

    expect(response.success).toBe(false)
    expect(response.error).toContain('缺少必要欄位')
  })

  it('應該成功開立發票', async () => {
    const ctx = new MockContext()
    ctx.setBody({ orderId: 'order-123', amount: 1000 })

    const response = await controller.store(ctx as any)

    expect(response.success).toBe(true)
    expect(response.data.id).toBeDefined()
    expect(response.data.invoiceNumber).toMatch(/^GX-\d{8}$/)
    expect(response.data.orderId).toBe('order-123')
    expect(response.data.amount).toBe(1000)
  })

  it('應該驗證查詢發票時需要 ID', async () => {
    const ctx = new MockContext()

    const response = await controller.show(ctx as any)

    expect(response.success).toBe(false)
    expect(response.error).toContain('缺少發票 ID')
  })

  it('應該查詢不存在的發票時返回 404', async () => {
    const ctx = new MockContext()
    ctx.setParam('id', 'non-existent')

    const response = await controller.show(ctx as any)

    expect(response.success).toBe(false)
  })

  it('應該驗證取消發票時需要 ID 和原因', async () => {
    const ctx = new MockContext()
    ctx.setBody({})

    const response = await controller.cancel(ctx as any)

    expect(response.success).toBe(false)
    expect(response.error).toContain('缺少發票 ID')
  })

  it('應該驗證生成報告時需要日期', async () => {
    const ctx = new MockContext()

    const response = await controller.report(ctx as any)

    expect(response.success).toBe(false)
    expect(response.error).toContain('缺少日期範圍參數')
  })

  it('應該驗證生成報告時日期格式', async () => {
    const ctx = new MockContext()
    ctx.setQuery('startDate', 'invalid-date')
    ctx.setQuery('endDate', 'invalid-date')

    const response = await controller.report(ctx as any)

    expect(response.success).toBe(false)
    expect(response.error).toContain('無效的日期格式')
  })
})
