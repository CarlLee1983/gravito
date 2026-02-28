import { UseCase } from '@gravito/enterprise'
import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import {
  type CancelInvoiceInput,
  type CancelInvoiceOutput,
  InvoiceCancellationContext,
} from '../Contexts/InvoiceCancellationContext'
import { type CancellationReason, DefaultInvoiceCanceller } from '../Roles/InvoiceCancellerRole'

export interface CancelInvoiceUseCaseInput {
  invoiceId: string
  reason: CancellationReason
  notes?: string
}

/**
 * 發票取消 UseCase（薄殼委派）
 * 委派到 InvoiceCancellationContext 進行實際業務流程處理
 */
export class CancelInvoice extends UseCase<CancelInvoiceUseCaseInput, CancelInvoiceOutput> {
  private context: InvoiceCancellationContext

  constructor(repository: IInvoiceRepository) {
    super()
    const canceller = new DefaultInvoiceCanceller()
    this.context = new InvoiceCancellationContext(repository, canceller)
  }

  async execute(input: CancelInvoiceUseCaseInput): Promise<CancelInvoiceOutput> {
    return this.context.orchestrate(input as CancelInvoiceInput)
  }
}
