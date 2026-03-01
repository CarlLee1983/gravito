import { Entity } from '@gravito/enterprise'
import { InvoiceAmount } from '../ValueObjects/InvoiceAmount'
import { InvoiceNumber } from '../ValueObjects/InvoiceNumber'
import { InvoiceStatus } from '../ValueObjects/InvoiceStatus'
import { InvoiceTax } from '../ValueObjects/InvoiceTax'

export interface InvoiceCreateInput {
  orderId: string
  invoiceNumber: string
  amount: number
  tax: number
  status?: string
  buyerIdentifier?: string
  carrierId?: string
  createdAt?: Date
}

export interface InvoiceProps {
  orderId: string
  invoiceNumber: InvoiceNumber
  amount: InvoiceAmount
  tax: InvoiceTax
  status: InvoiceStatus
  buyerIdentifier?: string
  carrierId?: string
  createdAt: Date
}

export interface InvoiceSnapshot {
  id: string
  orderId: string
  invoiceNumber: string
  amount: number
  amountCurrency: string
  tax: number
  taxRate: number
  status: string
  buyerIdentifier?: string
  carrierId?: string
  createdAt: Date
}

/**
 * 發票 Entity
 * 聚合根，管理發票的生命週期
 */
export class Invoice extends Entity<string> {
  private props: InvoiceProps

  private constructor(props: InvoiceProps, id?: string) {
    super(id || crypto.randomUUID())
    this.props = props
  }

  get orderId(): string {
    return this.props.orderId
  }

  get invoiceNumber(): string {
    return this.props.invoiceNumber.value
  }

  get invoiceNumberObject(): InvoiceNumber {
    return this.props.invoiceNumber
  }

  get amount(): number {
    return this.props.amount.value
  }

  get amountObject(): InvoiceAmount {
    return this.props.amount
  }

  get tax(): number {
    return this.props.tax.amount
  }

  get taxObject(): InvoiceTax {
    return this.props.tax
  }

  get status(): string {
    return this.props.status.value
  }

  get statusObject(): InvoiceStatus {
    return this.props.status
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get buyerIdentifier(): string | undefined {
    return this.props.buyerIdentifier
  }

  get carrierId(): string | undefined {
    return this.props.carrierId
  }

  /**
   * 建立新發票
   */
  static create(input: InvoiceCreateInput, id?: string): Invoice {
    const invoiceNumber = InvoiceNumber.create(input.invoiceNumber)
    const amount = InvoiceAmount.create(input.amount)
    const tax = InvoiceTax.create(input.tax, 0)
    const status = InvoiceStatus.create(input.status ?? 'ISSUED')

    return new Invoice(
      {
        orderId: input.orderId,
        invoiceNumber,
        amount,
        tax,
        status,
        buyerIdentifier: input.buyerIdentifier,
        carrierId: input.carrierId,
        createdAt: input.createdAt ?? new Date(),
      },
      id
    )
  }

  /**
   * 從快照重建
   */
  static fromSnapshot(snapshot: InvoiceSnapshot): Invoice {
    return new Invoice(
      {
        orderId: snapshot.orderId,
        invoiceNumber: InvoiceNumber.create(snapshot.invoiceNumber),
        amount: InvoiceAmount.create(snapshot.amount, snapshot.amountCurrency),
        tax: InvoiceTax.create(snapshot.tax, snapshot.taxRate),
        status: InvoiceStatus.create(snapshot.status as any),
        buyerIdentifier: snapshot.buyerIdentifier,
        carrierId: snapshot.carrierId,
        createdAt: snapshot.createdAt,
      },
      snapshot.id
    )
  }

  /**
   * 轉為快照
   */
  toSnapshot(): InvoiceSnapshot {
    return {
      id: this.id,
      orderId: this.orderId,
      invoiceNumber: this.invoiceNumber,
      amount: this.amount,
      amountCurrency: this.amountObject.currency,
      tax: this.tax,
      taxRate: this.taxObject.rate,
      status: this.status,
      buyerIdentifier: this.buyerIdentifier,
      carrierId: this.carrierId,
      createdAt: this.createdAt,
    }
  }

  /**
   * 解包為舊格式（向後相容）
   */
  unpack() {
    return {
      id: this.id,
      orderId: this.orderId,
      invoiceNumber: this.invoiceNumber,
      amount: this.amount,
      tax: this.tax,
      status: this.status,
      buyerIdentifier: this.buyerIdentifier,
      carrierId: this.carrierId,
      createdAt: this.createdAt,
    }
  }

  /**
   * 取消發票
   */
  cancel(): this {
    const newStatus = this.statusObject.toCancelled()
    this.props = {
      ...this.props,
      status: newStatus,
    }
    return this
  }

  /**
   * 退回發票
   */
  return(): this {
    const newStatus = this.statusObject.toReturned()
    this.props = {
      ...this.props,
      status: newStatus,
    }
    return this
  }
}
