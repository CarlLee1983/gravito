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
