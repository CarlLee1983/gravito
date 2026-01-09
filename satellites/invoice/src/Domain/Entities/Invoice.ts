import { Entity } from '@gravito/enterprise'

export interface InvoiceProps {
  orderId: string
  invoiceNumber: string
  amount: number
  tax: number
  status: 'ISSUED' | 'CANCELLED' | 'RETURNED'
  buyerIdentifier?: string
  carrierId?: string
  createdAt?: Date
}

export class Invoice extends Entity<string> {
  private _props: InvoiceProps

  private constructor(props: InvoiceProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  get orderId() {
    return this._props.orderId
  }
  get invoiceNumber() {
    return this._props.invoiceNumber
  }
  get amount() {
    return this._props.amount
  }
  get status() {
    return this._props.status
  }

  static create(props: InvoiceProps, id?: string) {
    return new Invoice(
      {
        ...props,
        status: props.status || 'ISSUED',
        createdAt: props.createdAt || new Date(),
      },
      id
    )
  }

  unpack(): InvoiceProps {
    return { ...this._props }
  }

  cancel() {
    this._props.status = 'CANCELLED'
  }
}
