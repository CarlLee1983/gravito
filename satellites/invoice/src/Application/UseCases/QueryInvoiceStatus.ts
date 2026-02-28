import { UseCase } from '@gravito/enterprise'
import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import { InvoiceAuditContext } from '../Contexts/InvoiceAuditContext'
import { DefaultInvoiceTracker } from '../Roles/InvoiceTrackerRole'

export interface QueryInvoiceStatusInput {
  invoiceId: string
}

export interface QueryInvoiceStatusOutput {
  id: string
  invoiceNumber: string
  orderId: string
  status: string
  amount: number
  createdAt: Date
}

export interface GenerateInvoiceReportInput {
  startDate: Date
  endDate: Date
}

/**
 * 發票查詢 UseCase（薄殼委派）
 */
export class QueryInvoiceStatus extends UseCase<QueryInvoiceStatusInput, QueryInvoiceStatusOutput> {
  private context: InvoiceAuditContext

  constructor(repository: IInvoiceRepository) {
    super()
    const tracker = new DefaultInvoiceTracker()
    this.context = new InvoiceAuditContext(repository, tracker)
  }

  async execute(input: QueryInvoiceStatusInput): Promise<QueryInvoiceStatusOutput> {
    return this.context.queryStatus(input)
  }
}

/**
 * 發票報告生成 UseCase（薄殼委派）
 */
export class GenerateInvoiceReport extends UseCase<GenerateInvoiceReportInput, any> {
  private context: InvoiceAuditContext

  constructor(repository: IInvoiceRepository) {
    super()
    const tracker = new DefaultInvoiceTracker()
    this.context = new InvoiceAuditContext(repository, tracker)
  }

  async execute(input: GenerateInvoiceReportInput): Promise<any> {
    return this.context.generateReport(input)
  }
}
