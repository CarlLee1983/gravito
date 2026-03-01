import { describe, expect, it } from 'bun:test'
import {
  DefaultInvoiceTracker,
  injectInvoiceTracker,
} from '../../../src/Application/Roles/InvoiceTrackerRole'
import { Invoice } from '../../../src/Domain/Entities/Invoice'
import { InvoiceNumber } from '../../../src/Domain/ValueObjects/InvoiceNumber'

describe('InvoiceTrackerRole', () => {
  it('應該追蹤現存的發票狀態', async () => {
    const tracker = new DefaultInvoiceTracker()
    const invoice = Invoice.create({
      orderId: 'order-123',
      invoiceNumber: 'GX-12345678',
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })

    tracker.trackInvoice(invoice)

    const status = await tracker.trackInvoiceStatus(invoice.id)

    expect(status).toBeDefined()
    expect(status).toBe('ISSUED')
  })

  it('應該在發票不存在時返回 null', async () => {
    const tracker = new DefaultInvoiceTracker()

    const status = await tracker.trackInvoiceStatus('non-existent-id')

    expect(status).toBeNull()
  })

  it('應該取得審計日誌', async () => {
    const tracker = new DefaultInvoiceTracker()
    const invoice = Invoice.create({
      orderId: 'order-123',
      invoiceNumber: 'GX-12345678',
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })

    tracker.trackInvoice(invoice)
    tracker.recordAuditLog({
      invoiceId: invoice.id,
      action: 'CREATED',
      timestamp: new Date(),
      details: { amount: 1000 },
    })

    const logs = await tracker.auditTrail(invoice.id)

    expect(logs.length).toBe(1)
    expect(logs[0].action).toBe('CREATED')
  })

  it('應該在沒有日誌時返回空陣列', async () => {
    const tracker = new DefaultInvoiceTracker()

    const logs = await tracker.auditTrail('non-existent-id')

    expect(logs).toEqual([])
  })

  it('應該生成報告', async () => {
    const tracker = new DefaultInvoiceTracker()

    // 建立多張發票
    for (let i = 0; i < 3; i++) {
      const invoice = Invoice.create({
        orderId: `order-${i}`,
        invoiceNumber: `GX-${String(i).padStart(8, '0')}`,
        amount: 1000 * (i + 1),
        tax: 50 * (i + 1),
        status: 'ISSUED',
      })
      tracker.trackInvoice(invoice)
    }

    const now = new Date()
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 昨天
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 明天

    const report = await tracker.generateReport(startDate, endDate)

    expect(report.summary.total).toBe(3)
    expect(report.summary.issued).toBe(3)
    expect(report.summary.cancelled).toBe(0)
    expect(report.summary.returned).toBe(0)
    expect(report.summary.totalAmount).toBe(1000 + 2000 + 3000)
    expect(report.invoices.length).toBe(3)
  })

  it('應該在日期範圍外篩選發票', async () => {
    const tracker = new DefaultInvoiceTracker()
    const invoice = Invoice.create({
      orderId: 'order-123',
      invoiceNumber: 'GX-12345678',
      amount: 1000,
      tax: 50,
      status: 'ISSUED',
    })
    tracker.trackInvoice(invoice)

    // 查詢過去時間範圍（發票在未來）
    const pastStart = new Date('2020-01-01')
    const pastEnd = new Date('2020-12-31')

    const report = await tracker.generateReport(pastStart, pastEnd)

    expect(report.summary.total).toBe(0)
    expect(report.invoices.length).toBe(0)
  })

  it('應該能透過注入函式取得角色', () => {
    const tracker = injectInvoiceTracker()

    expect(tracker).toBeDefined()
    expect(tracker.trackInvoiceStatus).toBeDefined()
    expect(tracker.auditTrail).toBeDefined()
    expect(tracker.generateReport).toBeDefined()
  })
})
