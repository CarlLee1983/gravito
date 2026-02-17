import type { DomainEvent } from '@gravito/enterprise'

export type EventListener = (event: DomainEvent) => void | Promise<void>

export class GravitoEventPublisher {
  private listeners: Map<string, EventListener[]> = new Map()

  subscribe(eventName: string, listener: EventListener): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, [])
    }
    this.listeners.get(eventName)!.push(listener)
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.eventName
    const handlers = this.listeners.get(eventName) || []

    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error) {
        console.error(`事件處理失敗 (${eventName}):`, error)
      }
    }
  }
}
