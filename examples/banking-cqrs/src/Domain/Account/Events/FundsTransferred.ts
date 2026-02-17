import { DomainEvent } from '@gravito/enterprise'

export interface FundsTransferredData {
  accountId: string
  toAccountId: string
  amount: number
  balanceAfter: number
  currency: string
  transferredAt: Date
}

export class FundsTransferred extends DomainEvent {
  constructor(
    readonly accountId: string,
    readonly toAccountId: string,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly transferredAt: Date = new Date()
  ) {
    super()
  }

  getAggregateId(): string {
    return this.accountId
  }

  toJSON(): FundsTransferredData {
    return {
      accountId: this.accountId,
      toAccountId: this.toAccountId,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      currency: this.currency,
      transferredAt: this.transferredAt,
    }
  }
}
