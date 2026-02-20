import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when an account is frozen.
 */
export class AccountFrozen extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the account being frozen.
   * @param payload - Details about the freeze operation.
   * @param timestamp - The exact time the freeze occurred.
   */
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
