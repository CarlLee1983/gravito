import type {
  DeliveryAttempt,
  EventQueryFilter,
  IncomingWebhookRecord,
  OutgoingWebhookRecord,
  WebhookRecord,
  WebhookStore,
} from './WebhookStore'

/**
 * 記憶體儲存實作（開發/測試用）
 */
export class MemoryWebhookStore implements WebhookStore {
  private events = new Map<string, WebhookRecord>()

  async saveIncomingEvent(event: IncomingWebhookRecord): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.events.set(id, { ...event, id, direction: 'incoming' })
    return id
  }

  async saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.events.set(id, { ...event, id, direction: 'outgoing' })
    return id
  }

  async updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void> {
    const event = this.events.get(id)
    if (event && event.direction === 'outgoing') {
      const outgoing = event as OutgoingWebhookRecord
      outgoing.attempts.push(attempt)
    }
  }

  async getEvent(id: string): Promise<WebhookRecord | null> {
    return this.events.get(id) ?? null
  }

  async queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]> {
    let results = Array.from(this.events.values())

    if (filter.direction) {
      results = results.filter((e) => e.direction === filter.direction)
    }
    if (filter.provider) {
      results = results.filter((e) => 'provider' in e && e.provider === filter.provider)
    }
    if (filter.status) {
      results = results.filter((e) => e.status === filter.status)
    }
    if (filter.from) {
      results = results.filter((e) => {
        const date = 'receivedAt' in e ? e.receivedAt : e.createdAt
        return date >= filter.from!
      })
    }
    if (filter.to) {
      results = results.filter((e) => {
        const date = 'receivedAt' in e ? e.receivedAt : e.createdAt
        return date <= filter.to!
      })
    }

    results.sort((a, b) => {
      const dateA = 'receivedAt' in a ? a.receivedAt : a.createdAt
      const dateB = 'receivedAt' in b ? b.receivedAt : b.createdAt
      return dateB.getTime() - dateA.getTime()
    })

    const offset = filter.offset ?? 0
    const limit = filter.limit ?? 100

    return results.slice(offset, offset + limit)
  }

  async markProcessed(id: string): Promise<void> {
    const event = this.events.get(id)
    if (event) {
      event.status = 'processed'
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const event = this.events.get(id)
    if (event) {
      event.status = 'failed'
      if ('processingError' in event) {
        event.processingError = error
      }
    }
  }
}
