import { Entity } from '@gravito/enterprise'
import { InvoiceAmount } from '../ValueObjects/InvoiceAmount'
import { InvoiceNumber } from '../ValueObjects/InvoiceNumber'
import { InvoiceStatus } from '../ValueObjects/InvoiceStatus'
import { InvoiceTax } from '../ValueObjects/InvoiceTax'

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

  get invoiceNumber(): InvoiceNumber {
    return this.props.invoiceNumber
  }

  get amount(): InvoiceAmount {
    return this.props.amount
  }

  get tax(): InvoiceTax {
    return this.props.tax
  }

  get status(): InvoiceStatus {
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
  static create(
    orderId: string,
    invoiceNumber: InvoiceNumber,
    amount: InvoiceAmount,
    tax: InvoiceTax,
    buyerIdentifier?: string,
    carrierId?: string
  ): Invoice {
    return new Invoice({
      orderId,
      invoiceNumber,
      amount,
      tax,
      status: InvoiceStatus.issued(),
      buyerIdentifier,
      carrierId,
      createdAt: new Date(),
    })
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
      invoiceNumber: this.invoiceNumber.value,
      amount: this.amount.value,
      amountCurrency: this.amount.currency,
      tax: this.tax.amount,
      taxRate: this.tax.rate,
      status: this.status.value,
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
      invoiceNumber: this.invoiceNumber.value,
      amount: this.amount.value,
      tax: this.tax.amount,
      status: this.status.value,
      buyerIdentifier: this.buyerIdentifier,
      carrierId: this.carrierId,
      createdAt: this.createdAt,
    }
  }

  /**
   * 取消發票
   */
  cancel(): Invoice {
    const newStatus = this.status.toCancelled()
    return new Invoice(
      {
        ...this.props,
        status: newStatus,
      },
      this.id
    )
  }

  /**
   * 退回發票
   */
  return(): Invoice {
    const newStatus = this.status.toReturned()
    return new Invoice(
      {
        ...this.props,
        status: newStatus,
      },
      this.id
    )
  }
}
