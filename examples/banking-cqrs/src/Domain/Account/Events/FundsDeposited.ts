import { DomainEvent } from '@gravito/enterprise'

export interface FundsDepositedData {
  accountId: string
  amount: number
  balanceAfter: number
  currency: string
  depositedAt: Date
}

export class FundsDeposited extends DomainEvent {
  constructor(
    readonly accountId: string,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly depositedAt: Date = new Date()
  ) {
    super()
  }

  getAggregateId(): string {
    return this.accountId
  }

  toJSON(): FundsDepositedData {
    return {
      accountId: this.accountId,
      amount: this.amount,
      balanceAfter: this.balanceAfter,
      currency: this.currency,
      depositedAt: this.depositedAt,
    }
  }
}
