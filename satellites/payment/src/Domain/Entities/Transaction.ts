import { Entity } from '@gravito/enterprise'

export enum TransactionStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface TransactionProps {
  orderId: string
  amount: number
  currency: string
  gateway: string
  gatewayTransactionId?: string
  status: TransactionStatus
  metadata: Record<string, any>
  createdAt: Date
}

export class Transaction extends Entity<string> {
  constructor(
    id: string,
    private props: TransactionProps
  ) {
    super(id)
  }

  static create(
    id: string,
    props: Omit<TransactionProps, 'status' | 'createdAt' | 'metadata'>
  ): Transaction {
    return new Transaction(id, {
      ...props,
      status: TransactionStatus.PENDING,
      metadata: {},
      createdAt: new Date(),
    })
  }

  authorize(gatewayId: string): void {
    if (this.props.status !== TransactionStatus.PENDING) {
      throw new Error('Only pending transactions can be authorized')
    }
    this.props.status = TransactionStatus.AUTHORIZED
    this.props.gatewayTransactionId = gatewayId
  }

  capture(): void {
    if (this.props.status !== TransactionStatus.AUTHORIZED) {
      throw new Error('Only authorized transactions can be captured')
    }
    this.props.status = TransactionStatus.CAPTURED
  }

  refund(): void {
    if (this.props.status !== TransactionStatus.CAPTURED) {
      throw new Error('Only captured transactions can be refunded')
    }
    this.props.status = TransactionStatus.REFUNDED
  }

  fail(reason: string): void {
    this.props.status = TransactionStatus.FAILED
    this.props.metadata.failReason = reason
  }

  get orderId() {
    return this.props.orderId
  }
  get amount() {
    return this.props.amount
  }
  get status() {
    return this.props.status
  }
  get gateway() {
    return this.props.gateway
  }
}
