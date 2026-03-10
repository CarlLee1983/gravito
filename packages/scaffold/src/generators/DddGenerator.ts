/**
 * DddGenerator - Domain-Driven Design Architecture Generator
 *
 * Generates a DDD structure with:
 * - Bounded Contexts (e.g., Ordering, Catalog, Identity)
 * - Shared Kernel for cross-context concerns
 * - Each context has Domain, Application, Infrastructure, UserInterface layers
 */

import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorConfig, type GeneratorContext } from './BaseGenerator'
import { AdvancedModuleGenerator } from './ddd/AdvancedModuleGenerator'
import { BootstrapGenerator } from './ddd/BootstrapGenerator'
import { CQRSQueryModuleGenerator } from './ddd/CQRSQueryModuleGenerator'
import { ModuleGenerator } from './ddd/ModuleGenerator'
import { SharedKernelGenerator } from './ddd/SharedKernelGenerator'

/**
 * DDD Module Type options
 * - simple: Basic CRUD structure
 * - advanced: Complete Event Sourcing with Aggregates, Events, EventStore, and EventApplier
 * - cqrs-query: CQRS Query Side with Read Models, Event Projectors, Query Services
 */
export type DddModuleType = 'simple' | 'advanced' | 'cqrs-query'

/**
 * DddGenerator implements the full Domain-Driven Design (DDD) architectural pattern.
 *
 * It generates a sophisticated structure including Bounded Contexts, Aggregates,
 * Value Objects, Domain Events, and a Shared Kernel. It is ideal for complex
 * enterprise applications with rich business logic.
 *
 * Supports multiple module templates:
 * - **simple**: Basic DDD structure with CRUD operations
 * - **advanced**: Complete Event Sourcing with Aggregate Roots, Domain Events, EventStore
 * - **cqrs-query**: CQRS read-side with Event Projectors and denormalized Read Models
 *
 * @public
 * @since 3.0.0
 */
export class DddGenerator extends BaseGenerator {
  private moduleGenerator: ModuleGenerator
  private advancedModuleGenerator: AdvancedModuleGenerator
  private cqrsQueryModuleGenerator: CQRSQueryModuleGenerator
  private sharedKernelGenerator: SharedKernelGenerator
  private bootstrapGenerator: BootstrapGenerator
  private moduleType: DddModuleType = 'simple'

  constructor(config: GeneratorConfig) {
    super(config)
    this.moduleGenerator = new ModuleGenerator()
    this.advancedModuleGenerator = new AdvancedModuleGenerator()
    this.cqrsQueryModuleGenerator = new CQRSQueryModuleGenerator()
    this.sharedKernelGenerator = new SharedKernelGenerator()
    this.bootstrapGenerator = new BootstrapGenerator()
  }

  /**
   * Set the module type for generated modules
   * @param type - 'simple' for basic CRUD, 'advanced' for Event Sourcing, 'cqrs-query' for CQRS Read Side
   * @default 'simple'
   */
  setModuleType(type: DddModuleType): void {
    this.moduleType = type
  }

  get architectureType() {
    return 'ddd' as const
  }

  get displayName(): string {
    return `Domain-Driven Design (DDD)${this.moduleType === 'cqrs-query' ? ' + CQRS' : ''}`
  }

  get description(): string {
    return 'Full DDD with Bounded Contexts, Aggregates, and Event-Driven patterns'
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    // Use the appropriate module generator based on module type
    const moduleGenerator = this.getModuleGenerator()

    return [
      this.bootstrapGenerator.generateConfigDirectory(context),
      {
        type: 'directory',
        name: 'src',
        children: [
          // Bootstrap - Application startup and configuration
          this.bootstrapGenerator.generate(context),
          // Shared - Cross-module shared components
          this.sharedKernelGenerator.generate(),
          // Modules - Bounded Contexts
          {
            type: 'directory',
            name: 'Modules',
            children: [
              moduleGenerator === 'cqrs-query'
                ? this.cqrsQueryModuleGenerator.generate('Ordering', context)
                : moduleGenerator === 'advanced'
                  ? this.advancedModuleGenerator.generate('Ordering', context)
                  : this.moduleGenerator.generate('Ordering', context),
              moduleGenerator === 'cqrs-query'
                ? this.cqrsQueryModuleGenerator.generate('Catalog', context)
                : moduleGenerator === 'advanced'
                  ? this.advancedModuleGenerator.generate('Catalog', context)
                  : this.moduleGenerator.generate('Catalog', context),
            ],
          },
          {
            type: 'file',
            name: 'main.ts',
            content: this.bootstrapGenerator.generateMainEntry(context),
          },
        ],
      },
      {
        type: 'directory',
        name: 'tests',
        children: [
          {
            type: 'directory',
            name: 'Modules',
            children: [
              {
                type: 'directory',
                name: 'Ordering',
                children: [
                  {
                    type: 'directory',
                    name: 'Unit',
                    children: [{ type: 'file', name: '.gitkeep', content: '' }],
                  },
                  {
                    type: 'directory',
                    name: 'Integration',
                    children: [{ type: 'file', name: '.gitkeep', content: '' }],
                  },
                ],
              },
              {
                type: 'directory',
                name: 'Catalog',
                children: [
                  {
                    type: 'directory',
                    name: 'Unit',
                    children: [{ type: 'file', name: '.gitkeep', content: '' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'directory',
            name: 'Shared',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
        ],
      },
    ]
  }

  /**
   * Get the active module generator type
   */
  private getModuleGenerator(): DddModuleType {
    return this.moduleType
  }

  /**
   * Override package.json for DDD architecture (uses main.ts instead of bootstrap.ts)
   */
  protected override generatePackageJson(context: GeneratorContext): string {
    const pkg = {
      name: context.nameKebabCase,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/main.ts',
        build: 'bun build ./src/main.ts --outdir ./dist --target bun',
        start: 'bun run dist/main.js',
        test: 'bun test',
        typecheck: 'bun tsc --noEmit',
        check: 'bun run typecheck && bun run test',
        'check:deps': 'bun run scripts/check-dependencies.ts',
        validate: 'bun run check && bun run check:deps',
        precommit: 'bun run validate',
        'docker:build': `docker build -t ${context.nameKebabCase} .`,
        'docker:run': `docker run -it -p 3000:3000 ${context.nameKebabCase}`,
      },
      dependencies: {
        '@gravito/core': '^1.0.0-beta.5',
        '@gravito/enterprise': 'workspace:*',
      },
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.9.3',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name} - DDD Architecture Guide

## Overview

This project follows **Domain-Driven Design (DDD)** with strategic and tactical patterns.

${
  this.moduleType === 'cqrs-query'
    ? `
## Module Types

This project uses **CQRS Query Module Template** with event projection:
- **Read Models**: Denormalized, query-optimized data structures
- **Event Projectors**: Pure functions transforming events to read models
- **Query Services**: Dedicated read-side use cases
- **Event Subscribers**: Subscribe to write-side domain events
- **Optional Caching**: Dual-tier caching (memory + Redis)

See each module's Domain/Projectors/{ModuleName}EventProjector.ts for projection patterns.

## CQRS Architecture

\`\`\`
Write Side (Command)          Read Side (Query)
┌──────────────────────┐      ┌──────────────────────┐
│ Aggregate Root       │      │ Read Model           │
│ (Event Sourcing)     │      │ (Denormalized)       │
└──────────────────────┘      └──────────────────────┘
        │                              ▲
        │ Domain Events                │
        ▼                              │
┌──────────────────────┐      ┌──────────────────────┐
│ Event Store          │─────▶│ Event Subscriber     │
└──────────────────────┘      └──────────────────────┘
                                      │
                                      │ Projects Events
                                      ▼
                             ┌──────────────────────┐
                             │ Event Projector      │
                             │ (Pure Functions)     │
                             └──────────────────────┘
                                      │
                                      ▼
                             ┌──────────────────────┐
                             │ Read Model DB        │
                             │ (Eventually Consistent)
                             └──────────────────────┘
\`\`\`
`
    : this.moduleType === 'advanced'
      ? `
## Module Types

This project uses **Advanced Module Template** with Event Sourcing:
- **Event Sourcing**: Complete event stream as source of truth
- **Aggregate Roots**: Domain objects managing state through events
- **Domain Events**: Rich, expressive events capturing domain changes
- **Event Store**: Persistent event log for state reconstruction
- **Event Applier**: Pure functions for immutable state transitions

See each module's Domain/Services/{ModuleName}EventApplier.ts for event handling patterns.
`
      : `
## Module Types

This project uses **Simple Module Template** with basic CRUD:
- **Aggregates**: Standard entity-based domain objects
- **Repositories**: Data access abstractions
- **Services**: Domain and application logic
- **Events**: Optional domain event support

To upgrade a module to Event Sourcing, use the Advanced template when scaffolding new modules.
`
}

## Service Providers

Service providers are the central place to configure your application and modules. They follow the ServiceProvider pattern with \`register()\` and \`boot()\` lifecycle methods.

### Internal Bootstrapping

1. **Bootstrap/app.ts**: Orchestrates the 4-step lifecycle (Configure, Boot, Register, Bootstrap).
2. **Bootstrap/providers.ts**: Central registry for all global and module-specific providers.
3. **Infrastructure/Providers/[Module]ServiceProvider.ts**: Module-specific service registration.

## Bounded Contexts

\`\`\`
┌─────────────────┐     ┌─────────────────┐
│    Ordering     │────▶│     Catalog     │
│  (Core Domain)  │     │ (Supporting)    │
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│  SharedKernel   │
│ (Shared Types)  │
└─────────────────┘
\`\`\`

## Context Structure

Each bounded context follows this structure:

\`\`\`
${
  this.moduleType === 'cqrs-query'
    ? `
Context/                     # CQRS Read Side Module
├── Domain/                  # Query domain logic
│   ├── ReadModels/         # Denormalized data structures (immutable)
│   ├── Projectors/         # Pure functions: Event → ReadModel
│   └── Repositories/       # Read model access interfaces
├── Application/            # Query use cases
│   ├── Services/          # Query services (findById, findAll, search, etc.)
│   └── DTOs/              # Data transfer objects for responses
├── Infrastructure/        # Data access & external services
│   ├── Repositories/      # Read model implementations (ORM)
│   ├── Subscribers/       # Event subscribers (trigger projections)
│   └── Cache/             # Optional caching layer (memory + Redis)
└── Presentation/          # Entry points
    ├── Controllers/       # HTTP query endpoints
    └── Routes/            # Route registration
\`\`\`

**Key Differences from Write Side:**
- No Commands (read-only)
- No EventStore (subscribes to write-side events)
- Pure projectors (deterministic, testable)
- Read models optimized for specific queries
- Eventual consistency (projections may lag behind events)
`
    : `
Context/
├── Domain/              # Core business logic
│   ├── Aggregates/     # Aggregate roots + entities
│   ├── Events/         # Domain events
│   ├── Repositories/   # Repository interfaces
│   ├── Services/       # Domain services (${this.moduleType === 'advanced' ? 'EventApplier for Event Sourcing' : 'domain logic'})
│   └── ValueObjects/   # Domain value objects
├── Application/        # Use cases
│   ├── Commands/       # Write operations
│   ├── Queries/        # Read operations
│   ├── EventHandlers/  # Event reactions
│   └── DTOs/           # Data transfer objects
├── Infrastructure/     # External concerns
│   ├── Persistence/    # Repository implementations
│   ├── EventStore/     # ${this.moduleType === 'advanced' ? 'Event storage and reconstruction' : '(optional) Event storage'}
│   └── Providers/      # DI configuration
└── UserInterface/      # Entry points
    ├── Http/           # REST controllers
    └── Cli/            # CLI commands
\`\`\`
`
}

## SharedKernel

Contains types shared across contexts:
- **ValueObjects**: Id, Money, Email
- **Primitives**: AggregateRoot, Entity, ValueObject
- **Events**: DomainEvent base class
- **EventBus**: Event dispatcher

## Key Patterns

1. **Aggregates**: Consistency boundaries
2. **Domain Events**: Inter-context communication
3. **CQRS**: Separate read/write models
4. **Repository Pattern**: Persistence abstraction
${
  this.moduleType === 'cqrs-query'
    ? `5. **Event Projection**: Transforming events to denormalized read models
6. **Pure Projectors**: Deterministic, testable event handlers
7. **Eventual Consistency**: Read models eventually consistent with events
8. **Query Optimization**: Read models optimized for specific use cases`
    : this.moduleType === 'advanced'
      ? '5. **Event Sourcing**: Event stream as single source of truth\n6. **Event Applier**: Pure functions for state transitions'
      : ''
}

Created with ❤️ using Gravito Framework
`
  }
}
