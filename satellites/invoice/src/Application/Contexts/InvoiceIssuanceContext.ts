import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import type { Invoice } from '../../Domain/Entities/Invoice'
import { DuplicateInvoiceError } from '../../Domain/Errors/InvoiceError'
import type { InvoiceIssuerRole } from '../Roles/InvoiceIssuerRole'

export interface IssueInvoiceInput {
  orderId: string
  amount: number
  buyerIdentifier?: string
  carrierId?: string
}

/**
 * 發票開立上下文 (DCI)
 * 編排發票開立的完整流程
 */
export class InvoiceIssuanceContext {
  constructor(
    private repository: IInvoiceRepository,
    private issuer: InvoiceIssuerRole
  ) {}

  async orchestrate(input: IssueInvoiceInput): Promise<Invoice> {
    // 1. 檢查訂單是否已有發票
    const existing = await this.repository.findByOrderId(input.orderId)
    if (existing) {
      throw new DuplicateInvoiceError(input.orderId)
    }

    // 2. 生成新發票
    const invoice = await this.issuer.issueInvoice(input)

    // 3. 保存發票
    await this.repository.save(invoice)

    return invoice
  }
}
