import type { EventManager } from '@gravito/core'
import type { AggregateRoot } from '@gravito/enterprise'

/**
 * Utility to unified dispatching of domain events from an aggregate root.
 * Extracts all pending events from the aggregate and dispatches them via the event manager.
 *
 * @param aggregate - The aggregate root instance containing domain events.
 * @param eventManager - The core event manager used to dispatch the events.
 */
export async function dispatchAggregateEvents(
  aggregate: AggregateRoot<any>,
  eventManager: EventManager
): Promise<void> {
  const events = aggregate.pullDomainEvents()
  for (const event of events) {
    await eventManager.dispatch(event as any)
  }
}
