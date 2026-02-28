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

/**
 * 發票取消者角色
 */
export interface InvoiceCancellerRole {
  cancel(input: CancelInvoiceInput): Promise<Invoice>
}

/**
 * 預設發票取消者實現
 */
export class DefaultInvoiceCanceller implements InvoiceCancellerRole {
  async cancel(input: CancelInvoiceInput): Promise<Invoice> {
    return input.invoice.cancel()
  }
}
