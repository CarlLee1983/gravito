import { describe, expect, test } from 'bun:test'
import { AggregateRoot, Command, DomainEvent, Query, ValueObject } from '../src'

describe('@gravito/enterprise DDD', () => {
  class MyId extends ValueObject<{ value: string }> {
    constructor(value: string) {
      super({ value })
    }
    get value() {
      return this.props.value
    }
  }

  class MyEvent extends DomainEvent {
    constructor(public readonly data: string) {
      super()
    }
  }

  class MyAggregate extends AggregateRoot<MyId> {
    public static create(id: MyId): MyAggregate {
      const agg = new MyAggregate(id)
      agg.addDomainEvent(new MyEvent('created'))
      return agg
    }
  }

  test('AggregateRoot should handle domain events', () => {
    const id = new MyId('123')
    const agg = MyAggregate.create(id)

    const events = agg.pullDomainEvents()
    expect(events.length).toBe(1)
    expect(events[0]).toBeInstanceOf(MyEvent)
    expect(agg.pullDomainEvents().length).toBe(0)
  })

  test('Command and Query should be instantiable', () => {
    class CreateUser extends Command {
      constructor(public readonly name: string) {
        super()
      }
    }
    class GetUser extends Query {
      constructor(public readonly id: string) {
        super()
      }
    }

    const cmd = new CreateUser('carl')
    const query = new GetUser('1')

    expect(cmd.name).toBe('carl')
    expect(query.id).toBe('1')
  })
})
