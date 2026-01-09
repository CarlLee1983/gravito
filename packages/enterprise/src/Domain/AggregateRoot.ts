import type { DomainEvent } from './DomainEvent'
import { Entity } from './Entity'

/**
 * Aggregate Root
 *
 * A DDD aggregate root that can record and clear domain events.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = []

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents]
    this._domainEvents = []
    return events
  }

  public clearDomainEvents(): void {
    this._domainEvents = []
  }
}
