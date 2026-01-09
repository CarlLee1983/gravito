# @gravito/enterprise

Enterprise architecture primitives for Gravito framework. This package provides the building blocks for Domain-Driven Design (DDD) and Clean Architecture in Gravito applications.

## Features

### Domain-Driven Design (DDD)
- **AggregateRoot**: Aggregate root entity with domain event management.
- **Entity**: Base entity class with identity equality.
- **ValueObject**: Immutable value types with structural equality.
- **DomainEvent**: Standard structure for domain events including ID and occurrence time.
- **Repository**: Generic repository interface definition.

### CQRS & Application
- **Command**: Base class for write operations.
- **Query**: Base class for read operations.
- **CommandHandler**: Interface for command handlers.
- **QueryHandler**: Interface for query handlers.
- **UseCase**: Simple clean architecture use case base class.

## Usage

### Defining an Aggregate Root

```typescript
import { AggregateRoot, DomainEvent, ValueObject } from '@gravito/enterprise'

class UserCreated extends DomainEvent {
  // ...
}

class UserId extends ValueObject<{ value: string }> {}

class User extends AggregateRoot<UserId> {
  static create(id: UserId, name: string): User {
    const user = new User(id)
    user.addDomainEvent(new UserCreated())
    return user
  }
}
```

### Implementing CQRS

```typescript
import { Command, CommandHandler } from '@gravito/enterprise'

class CreateUserCommand extends Command {
  constructor(public readonly name: string) { super() }
}

class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  async handle(command: CreateUserCommand): Promise<string> {
    // Logic here
    return 'new-id'
  }
}
```