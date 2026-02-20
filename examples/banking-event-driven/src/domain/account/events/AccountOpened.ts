import { DomainEvent } from '@gravito/enterprise'

export class AccountOpened extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      ownerId: string
      ownerName: string
      currency: string
      initialBalanceCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
