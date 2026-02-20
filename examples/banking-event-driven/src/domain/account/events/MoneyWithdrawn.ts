import { DomainEvent } from '@gravito/enterprise'

export class MoneyWithdrawn extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      amountCents: number
      newBalanceCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
