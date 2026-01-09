import { UseCase } from '@gravito/enterprise'
import type { IInvoiceRepository } from '../../Domain/Contracts/IInvoiceRepository'
import { Invoice } from '../../Domain/Entities/Invoice'

export interface IssueInvoiceInput {
  orderId: string
  amount: number
  buyerIdentifier?: string
  carrierId?: string
}

export class IssueInvoice extends UseCase<IssueInvoiceInput, Invoice> {
  constructor(private repository: IInvoiceRepository) {
    super()
  }

  async execute(input: IssueInvoiceInput): Promise<Invoice> {
    // 檢查是否已開立過
    const existing = await this.repository.findByOrderId(input.orderId)
    if (existing) {
      return existing
    }

    // 模擬發票號碼產生器
    const randomNum = Math.floor(10000000 + Math.random() * 90000000)
    const invoiceNumber = `GX-${randomNum}`

    const tax = Math.round(input.amount * 0.05)

    const invoice = Invoice.create({
      orderId: input.orderId,
      invoiceNumber,
      amount: input.amount,
      tax,
      status: 'ISSUED',
      buyerIdentifier: input.buyerIdentifier,
      carrierId: input.carrierId,
    })

    await this.repository.save(invoice)
    return invoice
  }
}
