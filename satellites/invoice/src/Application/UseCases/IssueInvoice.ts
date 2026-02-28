import { UseCase } from '@gravito/enterprise'
import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import type { Invoice } from '../../Domain/Entities/Invoice'
import { InvoiceIssuanceContext } from '../Contexts/InvoiceIssuanceContext'
import { DefaultInvoiceIssuer } from '../Roles/InvoiceIssuerRole'

export interface IssueInvoiceInput {
  orderId: string
  amount: number
  buyerIdentifier?: string
  carrierId?: string
}

/**
 * 發票開立 UseCase（薄殼委派）
 * 委派到 InvoiceIssuanceContext 進行實際業務流程處理
 */
export class IssueInvoice extends UseCase<IssueInvoiceInput, Invoice> {
  private context: InvoiceIssuanceContext

  constructor(repository: IInvoiceRepository) {
    super()
    const issuer = new DefaultInvoiceIssuer()
    this.context = new InvoiceIssuanceContext(repository, issuer)
  }

  async execute(input: IssueInvoiceInput): Promise<Invoice> {
    return this.context.orchestrate(input)
  }
}
