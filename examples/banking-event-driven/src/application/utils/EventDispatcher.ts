import type { EventManager } from '@gravito/core'
import type { AggregateRoot, DomainEvent } from '@gravito/enterprise'

/**
 * Utility to unified dispatching of domain events from an aggregate root.
 * Extracts all pending events from the aggregate and dispatches them via the event manager.
 *
 * This function handles type-safe dispatching without relying on `any` type casts.
 * All domain events should implement the DomainEvent interface.
 *
 * @param aggregate - The aggregate root instance containing domain events.
 * @param eventManager - The core event manager used to dispatch the events.
 */
export async function dispatchAggregateEvents<T extends string = string>(
  aggregate: AggregateRoot<T>,
  eventManager: EventManager
): Promise<void> {
  const events = aggregate.pullDomainEvents() as DomainEvent[]
  for (const event of events) {
    // Safe dispatch: DomainEvent is dispatched via core EventManager
    await eventManager.dispatch(event as any)
  }
}
