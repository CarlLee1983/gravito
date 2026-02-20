import type { TransferFailed } from '../../domain/account/events/TransferFailed'

export interface DLQRecord {
  eventId: string
  eventType: string
  aggregateId: string
  reason: string
  timestamp: Date
}

export class DeadLetterListener {
  private readonly dlq: DLQRecord[] = []

  handleTransferFailed(event: TransferFailed): void {
    this.dlq.push({
      eventId: event.eventId,
      eventType: 'TransferFailed',
      aggregateId: event.aggregateId,
      reason: event.payload.reason,
      timestamp: event.timestamp,
    })
  }

  getDLQRecords(): DLQRecord[] {
    return [...this.dlq]
  }

  clearDLQ(): void {
    this.dlq.length = 0
  }
}
