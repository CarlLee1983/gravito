import { DomainEvent } from '@gravito/enterprise'

export class TransferDebitApplied extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      transferId: string
      amountCents: number
      newBalanceCents: number
    },
    public readonly timestamp: Date = new Date()
  ) {
    super()
  }
}
