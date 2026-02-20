import { DomainEvent } from '@gravito/enterprise'

export class AccountUnfrozen extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: Record<string, never>,
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
