# CLI Init Command

The `gravito init` command scaffolds a new Gravito project with your chosen architecture pattern.

## Quick Start

```bash
# Interactive mode
npx gravito init my-app

# With options
npx gravito init my-app --architecture ddd --pm bun
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--architecture`, `-a` | Architecture pattern | (interactive) |
| `--pm` | Package manager (bun, npm, pnpm, yarn) | bun |
| `--skip-install` | Skip dependency installation | false |
| `--skip-git` | Skip git initialization | false |

## Architecture Patterns

### Enterprise MVC

Laravel-inspired MVC structure. Best for teams familiar with Laravel conventions.

```bash
gravito init my-app --architecture enterprise-mvc
```

**Structure:**
```
src/
├── Http/
│   ├── Kernel.ts           # Middleware management
│   ├── Controllers/        # Request handlers
│   └── Middleware/         # Request interceptors
├── Services/               # Business logic
├── Repositories/           # Data access
├── Models/                 # Data entities
├── Providers/              # Service providers
├── Exceptions/             # Error handlers
├── bootstrap.ts            # Entry point
└── routes.ts               # Route definitions
```

**Best for:**
- Teams migrating from Laravel/Express
- Traditional web applications
- Projects requiring rapid development

---

### Clean Architecture

Robert C. Martin's Clean Architecture with strict dependency rules.

```bash
gravito init my-app --architecture clean
```

**Structure:**
```
src/
├── Domain/                 # Enterprise business rules (NO dependencies)
│   ├── Entities/          # Business objects with identity
│   ├── ValueObjects/      # Immutable value types
│   ├── Interfaces/        # Repository contracts
│   └── Exceptions/        # Domain-level errors
├── Application/           # Application business rules
│   ├── UseCases/          # Business operations
│   ├── DTOs/              # Data transfer objects
│   └── Interfaces/        # Service contracts
├── Infrastructure/        # Frameworks & drivers
│   ├── Persistence/       # Database implementations
│   ├── ExternalServices/  # Third-party integrations
│   └── Providers/         # Service providers
├── Interface/             # Interface adapters
│   ├── Http/Controllers/  # HTTP handlers
│   ├── Http/Routes/       # Route definitions
│   └── Presenters/        # Response formatters
└── bootstrap.ts           # Entry point
```

**The Dependency Rule:**
> Inner layers know nothing about outer layers.

- **Domain**: Pure TypeScript, no framework dependencies
- **Application**: Depends only on Domain
- **Infrastructure**: Implements Domain interfaces
- **Interface**: Calls Application use cases

**Best for:**
- Long-lived enterprise applications
- Teams emphasizing testability
- Projects requiring strict separation of concerns

---

### Domain-Driven Design (DDD)

Modular architecture with bounded contexts and CQRS patterns.

```bash
gravito init my-app --architecture ddd
```

**Structure:**
```
src/
├── Bootstrap/              # Application startup
│   ├── app.ts             # Core initialization
│   ├── providers.ts       # Provider registration
│   ├── events.ts          # Event dispatcher
│   └── routes.ts          # Route registry
├── Shared/                 # Cross-module components
│   ├── Domain/
│   │   ├── Primitives/    # Entity, ValueObject, AggregateRoot
│   │   ├── Events/        # Domain event base
│   │   └── ValueObjects/  # Common value objects (Id, Email, Money)
│   ├── Infrastructure/    # Shared infra (EventBus)
│   └── Exceptions/        # Global exception handler
├── Modules/                # Bounded contexts
│   ├── Ordering/          # Order management module
│   │   ├── Domain/        # Aggregates, Events, Repositories
│   │   ├── Application/   # Commands, Queries, DTOs
│   │   └── Infrastructure/# Persistence, Providers
│   └── Catalog/           # Product catalog module
└── main.ts                 # Server entry point
```

**Key Concepts:**
- **Bounded Contexts** as separate modules
- **Aggregates** as consistency boundaries
- **Domain Events** for cross-module communication
- **CQRS** (Command Query Responsibility Segregation)

**Best for:**
- Complex domain logic
- Microservices preparation
- Teams practicing DDD

## Generated Files

All architectures include:

| File | Description |
|------|-------------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `.env.example` | Environment template |
| `.gitignore` | Git ignore rules |
| `ARCHITECTURE.md` | Architecture documentation |
| `README.md` | Project README |

## After Scaffolding

```bash
cd my-app

# Start development server
bun run dev

# Type check
bun run typecheck

# Run tests
bun test
```

## See Also

- [Project Structure](/en/docs/guide/project-structure)
- [Service Providers](/en/docs/guide/core-concepts#service-providers)
- [Routing](/en/docs/guide/routing)
