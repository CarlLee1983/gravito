import { Invoice } from '../../Domain/Entities/Invoice'
import { InvoiceAmount } from '../../Domain/ValueObjects/InvoiceAmount'
import { InvoiceNumber } from '../../Domain/ValueObjects/InvoiceNumber'
import { InvoiceTax } from '../../Domain/ValueObjects/InvoiceTax'

export interface IssueInvoiceInput {
  orderId: string
  amount: number
  buyerIdentifier?: string
  carrierId?: string
}

export interface IssueInvoiceOutput {
  invoice: Invoice
}

/**
 * 發票發行者角色
 */
export interface InvoiceIssuerRole {
  issueInvoice(input: IssueInvoiceInput): Promise<Invoice>
}

/**
 * 預設發票發行者實現
 */
export class DefaultInvoiceIssuer implements InvoiceIssuerRole {
  async issueInvoice(input: IssueInvoiceInput): Promise<Invoice> {
    const invoiceNumber = InvoiceNumber.generate()
    const amount = InvoiceAmount.create(input.amount, 'TWD')
    const tax = InvoiceTax.calculate(input.amount, 0.05)

    return Invoice.create(
      input.orderId,
      invoiceNumber,
      amount,
      tax,
      input.buyerIdentifier,
      input.carrierId
    )
  }
}
