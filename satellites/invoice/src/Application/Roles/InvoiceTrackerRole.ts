import type { Invoice } from '../../Domain/Entities/Invoice'

/**
 * 發票追蹤者角色
 */
export interface InvoiceTrackerRole {
  trackStatus(invoice: Invoice): Promise<void>
  generateReport(startDate: Date, endDate: Date): Promise<any>
}

/**
 * 預設發票追蹤者實現
 */
export class DefaultInvoiceTracker implements InvoiceTrackerRole {
  async trackStatus(_invoice: Invoice): Promise<void> {
    // 追蹤發票狀態
  }

  async generateReport(_startDate: Date, _endDate: Date): Promise<any> {
    // 生成報告
    return {}
  }
}
