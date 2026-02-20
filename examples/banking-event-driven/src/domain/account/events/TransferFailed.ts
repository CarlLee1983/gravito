import { DomainEvent } from '@gravito/enterprise'

export class TransferFailed extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      transferId: string
      fromAccountId: string
      toAccountId: string
      amountCents: number
      reason: string
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
