import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import { InvoiceNotFoundError } from '../../Domain/Errors/InvoiceError'
import type { InvoiceTrackerRole } from '../Roles/InvoiceTrackerRole'

export interface QueryStatusInput {
  invoiceId: string
}

export interface ReportInput {
  startDate: Date
  endDate: Date
}

export interface AuditTrailOutput {
  invoiceId: string
  logs: Array<{
    action: string
    timestamp: Date
    details?: Record<string, any>
  }>
}

/**
 * 發票審計上下文 (DCI)
 * 編排發票查詢和報告的流程
 */
export class InvoiceAuditContext {
  constructor(
    private repository: IInvoiceRepository,
    private tracker: InvoiceTrackerRole
  ) {}

  async queryStatus(input: QueryStatusInput) {
    const invoice = await this.repository.findById(input.invoiceId)
    if (!invoice) {
      throw new InvoiceNotFoundError(input.invoiceId)
    }

    await this.tracker.trackStatus(invoice)

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumberObject.value,
      orderId: invoice.orderId,
      status: invoice.statusObject.value,
      amount: invoice.amountObject.value,
      createdAt: invoice.createdAt,
    }
  }

  async generateReport(input: ReportInput) {
    const invoices = await this.repository.findByDateRange(input.startDate, input.endDate)

    // 追蹤這些發票以供審計使用
    for (const invoice of invoices) {
      await this.tracker.trackStatus(invoice)
    }

    return {
      period: { startDate: input.startDate, endDate: input.endDate },
      summary: {
        total: invoices.length,
        issued: invoices.filter((inv) => inv.statusObject.isIssued()).length,
        cancelled: invoices.filter((inv) => inv.statusObject.isCancelled()).length,
        returned: invoices.filter((inv) => inv.statusObject.isReturned()).length,
        totalAmount: invoices.reduce((sum: number, inv) => sum + inv.amountObject.value, 0),
      },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        number: inv.invoiceNumberObject.value,
        orderId: inv.orderId,
        amount: inv.amountObject.value,
        status: inv.statusObject.value,
        createdAt: inv.createdAt,
      })),
    }
  }

  async getAuditTrail(input: { invoiceId: string }): Promise<AuditTrailOutput> {
    const invoice = await this.repository.findById(input.invoiceId)
    if (!invoice) {
      throw new InvoiceNotFoundError(input.invoiceId)
    }

    const logs = await this.tracker.auditTrail(input.invoiceId)

    return {
      invoiceId: input.invoiceId,
      logs: logs.map((log) => ({
        action: log.action,
        timestamp: log.timestamp,
        details: log.details,
      })),
    }
  }
}
