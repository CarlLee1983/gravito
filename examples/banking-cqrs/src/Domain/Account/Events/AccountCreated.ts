import { DomainEvent } from '@gravito/enterprise'

export interface AccountCreatedData {
  accountId: string
  ownerName: string
  currency: string
  createdAt: Date
}

export class AccountCreated extends DomainEvent {
  constructor(
    readonly accountId: string,
    readonly ownerName: string,
    readonly currency: string,
    readonly createdAt: Date = new Date()
  ) {
    super()
  }

  getAggregateId(): string {
    return this.accountId
  }

  toJSON(): AccountCreatedData {
    return {
      accountId: this.accountId,
      ownerName: this.ownerName,
      currency: this.currency,
      createdAt: this.createdAt,
    }
  }
}
