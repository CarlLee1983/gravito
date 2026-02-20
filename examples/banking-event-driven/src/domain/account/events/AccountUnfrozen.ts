import { DomainEvent } from '@gravito/enterprise'

/**
 * Event triggered when an account is unfrozen and returned to active status.
 */
export class AccountUnfrozen extends DomainEvent {
  /**
   * @param aggregateId - The unique ID of the account being unfrozen.
   * @param payload - Empty payload for the unfreeze event.
   * @param timestamp - The exact time the unfreeze occurred.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly payload: Record<string, never>,
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
