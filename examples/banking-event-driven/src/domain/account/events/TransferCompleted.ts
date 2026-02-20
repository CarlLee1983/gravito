import { DomainEvent } from '@gravito/enterprise'

export class TransferCompleted extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      transferId: string
      fromAccountId: string
      toAccountId: string
      amountCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
