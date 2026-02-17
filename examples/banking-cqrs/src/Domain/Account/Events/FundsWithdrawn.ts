import { DomainEvent } from '@gravito/enterprise'

export interface FundsWithdrawnData {
  accountId: string
  amount: number
  balanceAfter: number
  currency: string
  withdrawnAt: Date
}

export class FundsWithdrawn extends DomainEvent {
  constructor(
    readonly accountId: string,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly withdrawnAt: Date = new Date()
  ) {
    super()
  }

  getAggregateId(): string {
    return this.accountId
  }

  toJSON(): FundsWithdrawnData {
    return {
      accountId: this.accountId,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      currency: this.currency,
      withdrawnAt: this.withdrawnAt,
    }
  }
}
