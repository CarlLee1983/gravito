import type { Invoice } from '../../Domain/Entities/Invoice'

export type CancellationReason =
  | 'CUSTOMER_REQUEST'
  | 'PAYMENT_FAILED'
  | 'ORDER_CANCELLED'
  | 'DUPLICATE'
  | 'OTHER'

export interface CancelInvoiceInput {
  invoice: Invoice
  reason: CancellationReason
  notes?: string
}

export interface CancellationRecord {
  invoiceId: string
  reason: CancellationReason
  notes?: string
  timestamp: Date
}

/**
 * 發票取消者角色
 */
export interface InvoiceCancellerRole {
  cancel(input: CancelInvoiceInput): Promise<Invoice>
  validateCancellationEligibility(invoice: Invoice): boolean
  recordCancellationReason(
    invoiceId: string,
    reason: CancellationReason,
    notes?: string
  ): CancellationRecord
  notifyRelatedServices(invoiceId: string): Promise<void>
}

/**
 * 預設發票取消者實現
 */
export class DefaultInvoiceCanceller implements InvoiceCancellerRole {
  private cancellationRecords: Map<string, CancellationRecord> = new Map()

  validateCancellationEligibility(invoice: Invoice): boolean {
    return invoice.statusObject.canBeCancelled()
  }

  recordCancellationReason(
    invoiceId: string,
    reason: CancellationReason,
    notes?: string
  ): CancellationRecord {
    const record: CancellationRecord = {
      invoiceId,
      reason,
      notes,
      timestamp: new Date(),
    }
    this.cancellationRecords.set(invoiceId, record)
    return record
  }

  getCancellationRecord(invoiceId: string): CancellationRecord | undefined {
    return this.cancellationRecords.get(invoiceId)
  }

  async notifyRelatedServices(invoiceId: string): Promise<void> {
    const record = this.cancellationRecords.get(invoiceId)
    if (!record) {
      throw new Error(`No cancellation record found for invoice ${invoiceId}`)
    }
    // 實際實現應該透過 event bus 通知相關服務
    // 這裡只是佔位符
  }

  async cancel(input: CancelInvoiceInput): Promise<Invoice> {
    // 驗證是否可取消
    if (!this.validateCancellationEligibility(input.invoice)) {
      throw new Error(`Invoice ${input.invoice.id} cannot be cancelled`)
    }

    // 記錄取消
    this.recordCancellationReason(input.invoice.id, input.reason, input.notes)

    // 通知相關服務
    await this.notifyRelatedServices(input.invoice.id)

    // 執行取消
    return input.invoice.cancel()
  }
}

/**
 * 注入函式 - 用於 DI 容器
 */
export function injectInvoiceCanceller(): InvoiceCancellerRole {
  return new DefaultInvoiceCanceller()
}
