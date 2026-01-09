import { describe, expect, test } from 'bun:test'
import { AggregateRoot, DomainEvent, Entity, ValueObject } from '../src'

class ExampleEntity extends Entity<string> {}
class OtherEntity extends Entity<string> {}

class ExampleValue extends ValueObject<{ value: string }> {}
class OtherValue extends ValueObject<{ value: string }> {}

class ExampleEvent extends DomainEvent {}

class ExampleAggregate extends AggregateRoot<string> {
  public record(event: DomainEvent) {
    this.addDomainEvent(event)
  }
}

describe('Enterprise coverage extras', () => {
  test('Entity.equals handles null, same instance, and other types', () => {
    const one = new ExampleEntity('1')
    const two = new ExampleEntity('1')
    const other = new OtherEntity('1')
    const notEntity = { id: '1' }

    expect(one.equals(null as unknown as ExampleEntity)).toBe(false)
    expect(one.equals(undefined as unknown as ExampleEntity)).toBe(false)
    expect(one.equals(one)).toBe(true)
    expect(one.equals(two)).toBe(true)
    expect(one.equals(other as unknown as ExampleEntity)).toBe(true)
    expect(one.equals(notEntity as unknown as ExampleEntity)).toBe(false)
  })

  test('ValueObject.equals rejects different constructors', () => {
    const a = new ExampleValue({ value: 'a' })
    const b = new OtherValue({ value: 'a' })

    expect(a.equals(b as unknown as ExampleValue)).toBe(false)
  })

  test('DomainEvent uses defaults and exposes name', () => {
    const when = new Date('2024-01-01T00:00:00.000Z')
    const event = new ExampleEvent('evt-1', when)

    expect(event.eventId).toBe('evt-1')
    expect(event.occurredOn).toBe(when)
    expect(event.eventName).toBe('ExampleEvent')
  })

  test('AggregateRoot clears events', () => {
    const agg = new ExampleAggregate('agg-1')
    agg.record(new ExampleEvent())
    expect(agg.pullDomainEvents().length).toBe(1)

    agg.record(new ExampleEvent())
    agg.clearDomainEvents()
    expect(agg.pullDomainEvents().length).toBe(0)
  })
})
