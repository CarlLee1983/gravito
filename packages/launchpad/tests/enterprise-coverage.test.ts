import { describe, expect, test } from 'bun:test'
import {
  AggregateRoot,
  Command,
  DomainEvent,
  Entity,
  Query,
  UseCase,
  ValueObject,
} from '@gravito/enterprise'

class ExampleEntity extends Entity<string> {}
class ExampleValue extends ValueObject<{ value: string }> {}
class ExampleEvent extends DomainEvent {}

class ExampleAggregate extends AggregateRoot<string> {
  record(event: DomainEvent) {
    this.addDomainEvent(event)
  }
}

class ExampleCommand extends Command {
  constructor(public readonly name: string) {
    super()
  }
}

class ExampleQuery extends Query {
  constructor(public readonly id: string) {
    super()
  }
}

class ExampleUseCase extends UseCase<string, string> {
  execute(input: string): string {
    return input.toUpperCase()
  }
}

describe('Launchpad enterprise coverage', () => {
  test('covers core enterprise primitives', () => {
    const entity = new ExampleEntity('1')
    const same = new ExampleEntity('1')
    expect(entity.equals(same)).toBe(true)

    const value = new ExampleValue({ value: 'a' })
    const valueSame = new ExampleValue({ value: 'a' })
    expect(value.equals(valueSame)).toBe(true)

    const agg = new ExampleAggregate('agg-1')
    agg.record(new ExampleEvent())
    expect(agg.pullDomainEvents().length).toBe(1)

    const cmd = new ExampleCommand('go')
    const query = new ExampleQuery('q1')
    expect(cmd.name).toBe('go')
    expect(query.id).toBe('q1')

    const useCase = new ExampleUseCase()
    expect(useCase.execute('ok')).toBe('OK')
  })
})
