import { DomainEvent } from '@gravito/enterprise'

export class MoneyDeposited extends DomainEvent {
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
