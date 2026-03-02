import { Invoice } from '../../Domain/Entities/Invoice'
import { InvalidOrderIdError } from '../../Domain/Errors/InvoiceError'
import { InvoiceNumber } from '../../Domain/ValueObjects/InvoiceNumber'
import { InvoiceTax } from '../../Domain/ValueObjects/InvoiceTax'

export interface IssueInvoiceInput {
  orderId: string
  amount: number
  currency?: string
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
  generateInvoiceNumber(): InvoiceNumber
  calculateTax(amount: number, rate?: number): InvoiceTax
  validateOrderForInvoicing(orderId: string): Promise<boolean>
}

/**
 * 預設發票發行者實現
 */
export class DefaultInvoiceIssuer implements InvoiceIssuerRole {
  generateInvoiceNumber(): InvoiceNumber {
    return InvoiceNumber.generate()
  }

  calculateTax(amount: number, rate = 0.05): InvoiceTax {
    return InvoiceTax.calculate(amount, rate)
  }

  async validateOrderForInvoicing(orderId: string): Promise<boolean> {
    // 基本驗證 - 檢查 orderId 是否為有效字符串
    return typeof orderId === 'string' && orderId.length > 0
  }

  async issueInvoice(input: IssueInvoiceInput): Promise<Invoice> {
    // 驗證 orderId
    if (!(await this.validateOrderForInvoicing(input.orderId))) {
      throw new InvalidOrderIdError(input.orderId)
    }

    const invoiceNumber = this.generateInvoiceNumber()
    const tax = this.calculateTax(input.amount, 0.05)

    return Invoice.create({
      orderId: input.orderId,
      invoiceNumber: invoiceNumber.value,
      amount: input.amount,
      currency: input.currency ?? 'TWD',
      tax: tax.amount,
      taxRate: tax.rate,
      buyerIdentifier: input.buyerIdentifier,
      carrierId: input.carrierId,
    })
  }
}

/**
 * 注入函式 - 用於 DI 容器
 */
export function injectInvoiceIssuer(): InvoiceIssuerRole {
  return new DefaultInvoiceIssuer()
}
