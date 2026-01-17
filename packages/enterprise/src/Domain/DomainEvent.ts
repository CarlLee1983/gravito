/**
 * Base class for all Domain Events.
 *
 * Domain events represent something that happened in the domain that is
 * relevant to other parts of the system or external services.
 *
 * @public
 * @since 3.0.0
 */
export abstract class DomainEvent {
  public readonly occurredOn: Date
  public readonly eventId: string

  constructor(eventId?: string, occurredOn?: Date) {
    this.eventId = eventId || crypto.randomUUID()
    this.occurredOn = occurredOn || new Date()
  }

  get eventName(): string {
    return this.constructor.name
  }
}
