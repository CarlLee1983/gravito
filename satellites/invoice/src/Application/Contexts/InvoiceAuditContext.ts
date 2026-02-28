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
      invoiceNumber: invoice.invoiceNumber.value,
      orderId: invoice.orderId,
      status: invoice.status.value,
      amount: invoice.amount.value,
      createdAt: invoice.createdAt,
    }
  }

  async generateReport(input: ReportInput) {
    const invoices = await this.repository.findByDateRange(input.startDate, input.endDate)
    const report = await this.tracker.generateReport(input.startDate, input.endDate)

    return {
      period: { startDate: input.startDate, endDate: input.endDate },
      summary: {
        total: invoices.length,
        issued: invoices.filter((inv: any) => inv.status.isIssued()).length,
        cancelled: invoices.filter((inv: any) => inv.status.isCancelled()).length,
        returned: invoices.filter((inv: any) => inv.status.isReturned()).length,
        totalAmount: invoices.reduce((sum: number, inv: any) => sum + inv.amount.value, 0),
      },
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        number: inv.invoiceNumber.value,
        orderId: inv.orderId,
        amount: inv.amount.value,
        status: inv.status.value,
        createdAt: inv.createdAt,
      })),
      ...report,
    }
  }
}
