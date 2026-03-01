import type { Invoice } from '../../Domain/Entities/Invoice'

export interface AuditLog {
  invoiceId: string
  action: string
  timestamp: Date
  details?: Record<string, any>
}

export interface ReportSummary {
  total: number
  issued: number
  cancelled: number
  returned: number
  totalAmount: number
}

export interface ReportData {
  summary: ReportSummary
  invoices: Array<{
    id: string
    number: string
    orderId: string
    amount: number
    status: string
    createdAt: Date
  }>
}

/**
 * 發票追蹤者角色
 */
export interface InvoiceTrackerRole {
  trackStatus(invoice: Invoice): Promise<void>
  trackStatus(invoiceId: string): Promise<void>
  trackInvoiceStatus(invoiceId: string): Promise<string | null>
  generateReport(startDate: Date, endDate: Date): Promise<ReportData>
  recordAuditLog(log: AuditLog): void
  auditTrail(invoiceId: string): Promise<AuditLog[]>
  trackInvoice(invoice: Invoice): void
}

/**
 * 預設發票追蹤者實現
 */
export class DefaultInvoiceTracker implements InvoiceTrackerRole {
  private invoices: Map<string, Invoice> = new Map()
  private auditLogs: Map<string, AuditLog[]> = new Map()

  trackInvoice(invoice: Invoice): void {
    this.invoices.set(invoice.id, invoice)
  }

  async trackStatus(invoiceOrId: Invoice | string): Promise<void> {
    // 接受 Invoice 或 string（invoiceId）
    if (typeof invoiceOrId === 'string') {
      // 如果是字符串，暫時不做任何操作
      return
    }
    // 追蹤發票狀態
    this.trackInvoice(invoiceOrId)
  }

  async trackInvoiceStatus(invoiceId: string): Promise<string | null> {
    const invoice = this.invoices.get(invoiceId)
    return invoice ? invoice.status : null
  }

  recordAuditLog(log: AuditLog): void {
    if (!this.auditLogs.has(log.invoiceId)) {
      this.auditLogs.set(log.invoiceId, [])
    }
    this.auditLogs.get(log.invoiceId)?.push(log)
  }

  async auditTrail(invoiceId: string): Promise<AuditLog[]> {
    return this.auditLogs.get(invoiceId) ?? []
  }

  async generateReport(startDate: Date, endDate: Date): Promise<ReportData> {
    const invoices = Array.from(this.invoices.values()).filter(
      (inv) => inv.createdAt >= startDate && inv.createdAt <= endDate
    )

    const summary: ReportSummary = {
      total: invoices.length,
      issued: invoices.filter((inv) => inv.statusObject.isIssued()).length,
      cancelled: invoices.filter((inv) => inv.statusObject.isCancelled()).length,
      returned: invoices.filter((inv) => inv.statusObject.isReturned()).length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.amountObject.value, 0),
    }

    return {
      summary,
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
}

/**
 * 注入函式 - 用於 DI 容器
 */
export function injectInvoiceTracker(): InvoiceTrackerRole {
  return new DefaultInvoiceTracker()
}
