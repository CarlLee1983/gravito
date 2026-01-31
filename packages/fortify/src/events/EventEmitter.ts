import type { FortifyEvents } from './types'

type EventListener<T> = (data: T) => void | Promise<void>

export class FortifyEventEmitter {
  private listeners = new Map<string, Set<EventListener<any>>>()

  on<K extends keyof FortifyEvents>(
    event: K,
    listener: EventListener<FortifyEvents[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(listener)

    return () => this.off(event, listener)
  }

  off<K extends keyof FortifyEvents>(event: K, listener: EventListener<FortifyEvents[K]>): void {
    this.listeners.get(event)?.delete(listener)
  }

  async emit<K extends keyof FortifyEvents>(event: K, data: FortifyEvents[K]): Promise<void> {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners || eventListeners.size === 0) {
      return
    }

    await Promise.all(Array.from(eventListeners).map((listener) => listener(data)))
  }

  removeAllListeners(event?: keyof FortifyEvents): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  listenerCount(event: keyof FortifyEvents): number {
    return this.listeners.get(event)?.size ?? 0
  }

  eventNames(): (keyof FortifyEvents)[] {
    return Array.from(this.listeners.keys()) as (keyof FortifyEvents)[]
  }
}
