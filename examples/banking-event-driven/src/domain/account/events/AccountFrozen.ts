import { DomainEvent } from '@gravito/enterprise'

export class AccountFrozen extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      reason?: string
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
