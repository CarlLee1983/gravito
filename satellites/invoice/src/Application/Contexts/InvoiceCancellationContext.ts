import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import { InvalidCancellationError, InvoiceNotFoundError } from '../../Domain/Errors/InvoiceError'
import type { CancellationReason, InvoiceCancellerRole } from '../Roles/InvoiceCancellerRole'

export interface CancelInvoiceInput {
  invoiceId: string
  reason: CancellationReason
  notes?: string
}

export interface CancelInvoiceOutput {
  id: string
  invoiceNumber: string
  previousStatus: string
  newStatus: string
  cancelledAt: Date
}

/**
 * 發票取消上下文 (DCI)
 * 編排發票取消的完整流程
 */
export class InvoiceCancellationContext {
  constructor(
    private repository: IInvoiceRepository,
    private canceller: InvoiceCancellerRole
  ) {}

  async orchestrate(input: CancelInvoiceInput): Promise<CancelInvoiceOutput> {
    // 1. 查詢發票
    const invoice = await this.repository.findById(input.invoiceId)
    if (!invoice) {
      throw new InvoiceNotFoundError(input.invoiceId)
    }

    // 2. 驗證是否可取消
    if (!invoice.status.isIssued()) {
      throw new InvalidCancellationError(`Cannot cancel ${invoice.status.value} invoice`)
    }

    // 3. 執行取消
    const cancelled = await this.canceller.cancel({
      invoice,
      reason: input.reason,
      notes: input.notes,
    })

    // 4. 保存
    await this.repository.save(cancelled)

    // 5. 返回結果
    return {
      id: cancelled.id,
      invoiceNumber: cancelled.invoiceNumber.value,
      previousStatus: 'ISSUED',
      newStatus: cancelled.status.value,
      cancelledAt: new Date(),
    }
  }
}
