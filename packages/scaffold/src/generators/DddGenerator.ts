/**
 * DddGenerator - Domain-Driven Design Architecture Generator
 *
 * Generates a DDD structure with:
 * - Bounded Contexts (e.g., Ordering, Catalog, Identity)
 * - Shared Kernel for cross-context concerns
 * - Each context has Domain, Application, Infrastructure, UserInterface layers
 */

import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorContext } from './BaseGenerator'

export class DddGenerator extends BaseGenerator {
  get architectureType() {
    return 'ddd' as const
  }

  get displayName(): string {
    return 'Domain-Driven Design (DDD)'
  }

  get description(): string {
    return 'Full DDD with Bounded Contexts, Aggregates, and Event-Driven patterns'
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'config',
        children: [
          { type: 'file', name: 'app.ts', content: this.generateAppConfig(context) },
          { type: 'file', name: 'database.ts', content: this.generateDatabaseConfig() },
          { type: 'file', name: 'modules.ts', content: this.generateModulesConfig() },
          { type: 'file', name: 'cache.ts', content: this.generateCacheConfig() },
          { type: 'file', name: 'logging.ts', content: this.generateLoggingConfig() },
        ],
      },
      {
        type: 'directory',
        name: 'src',
        children: [
          // Bootstrap - Application startup and configuration
          this.generateBootstrapDirectory(context),
          // Shared - Cross-module shared components
          this.generateShared(),
          // Modules - Bounded Contexts
          {
            type: 'directory',
            name: 'Modules',
            children: [
              this.generateModule('Ordering', context),
              this.generateModule('Catalog', context),
            ],
          },
          { type: 'file', name: 'main.ts', content: this.generateMainEntry(context) },
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

  // ─────────────────────────────────────────────────────────────
  // Bootstrap Directory
  // ─────────────────────────────────────────────────────────────

  private generateBootstrapDirectory(context: GeneratorContext): DirectoryNode {
    return {
      type: 'directory',
      name: 'Bootstrap',
      children: [
        { type: 'file', name: 'app.ts', content: this.generateBootstrapApp(context) },
        { type: 'file', name: 'providers.ts', content: this.generateProvidersRegistry(context) },
        { type: 'file', name: 'events.ts', content: this.generateEventsRegistry() },
        { type: 'file', name: 'routes.ts', content: this.generateRoutesRegistry(context) },
      ],
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Shared Directory (replaces SharedKernel with user's structure)
  // ─────────────────────────────────────────────────────────────

  private generateShared(): DirectoryNode {
    return {
      type: 'directory',
      name: 'Shared',
      children: [
        {
          type: 'directory',
          name: 'Domain',
          children: [
            {
              type: 'directory',
              name: 'ValueObjects',
              children: [
                { type: 'file', name: 'Id.ts', content: this.generateIdValueObject() },
                { type: 'file', name: 'Money.ts', content: this.generateMoneyValueObject() },
                { type: 'file', name: 'Email.ts', content: this.generateEmailValueObject() },
              ],
            },
            {
              type: 'directory',
              name: 'Events',
              children: [
                { type: 'file', name: 'DomainEvent.ts', content: this.generateDomainEvent() },
              ],
            },
            {
              type: 'directory',
              name: 'Primitives',
              children: [
                { type: 'file', name: 'AggregateRoot.ts', content: this.generateAggregateRoot() },
                { type: 'file', name: 'Entity.ts', content: this.generateEntity() },
                { type: 'file', name: 'ValueObject.ts', content: this.generateValueObject() },
              ],
            },
          ],
        },
        {
          type: 'directory',
          name: 'Infrastructure',
          children: [
            {
              type: 'directory',
              name: 'EventBus',
              children: [
                {
                  type: 'file',
                  name: 'EventDispatcher.ts',
                  content: this.generateEventDispatcher(),
                },
              ],
            },
          ],
        },
        {
          type: 'directory',
          name: 'Exceptions',
          children: [
            { type: 'file', name: 'Handler.ts', content: this.generateExceptionHandler() },
          ],
        },
      ],
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Module Generator (replaces Bounded Context)
  // ─────────────────────────────────────────────────────────────

  private generateModule(name: string, context: GeneratorContext): DirectoryNode {
    return {
      type: 'directory',
      name: name,
      children: [
        // Domain Layer
        {
          type: 'directory',
          name: 'Domain',
          children: [
            {
              type: 'directory',
              name: 'Aggregates',
              children: [
                {
                  type: 'directory',
                  name: name,
                  children: [
                    { type: 'file', name: `${name}.ts`, content: this.generateAggregate(name) },
                    {
                      type: 'file',
                      name: `${name}Status.ts`,
                      content: this.generateAggregateStatus(name),
                    },
                  ],
                },
              ],
            },
            {
              type: 'directory',
              name: 'Events',
              children: [
                {
                  type: 'file',
                  name: `${name}Created.ts`,
                  content: this.generateCreatedEvent(name),
                },
              ],
            },
            {
              type: 'directory',
              name: 'Repositories',
              children: [
                {
                  type: 'file',
                  name: `I${name}Repository.ts`,
                  content: this.generateRepositoryInterface(name),
                },
              ],
            },
            {
              type: 'directory',
              name: 'Services',
              children: [{ type: 'file', name: '.gitkeep', content: '' }],
            },
          ],
        },
        // Application Layer
        {
          type: 'directory',
          name: 'Application',
          children: [
            {
              type: 'directory',
              name: 'Commands',
              children: [
                {
                  type: 'directory',
                  name: `Create${name}`,
                  children: [
                    {
                      type: 'file',
                      name: `Create${name}Command.ts`,
                      content: this.generateCommand(name),
                    },
                    {
                      type: 'file',
                      name: `Create${name}Handler.ts`,
                      content: this.generateCommandHandler(name),
                    },
                  ],
                },
              ],
            },
            {
              type: 'directory',
              name: 'Queries',
              children: [
                {
                  type: 'directory',
                  name: `Get${name}ById`,
                  children: [
                    {
                      type: 'file',
                      name: `Get${name}ByIdQuery.ts`,
                      content: this.generateQuery(name),
                    },
                    {
                      type: 'file',
                      name: `Get${name}ByIdHandler.ts`,
                      content: this.generateQueryHandler(name),
                    },
                  ],
                },
              ],
            },
            {
              type: 'directory',
              name: 'DTOs',
              children: [{ type: 'file', name: `${name}DTO.ts`, content: this.generateDTO(name) }],
            },
          ],
        },
        // Infrastructure Layer
        {
          type: 'directory',
          name: 'Infrastructure',
          children: [
            {
              type: 'directory',
              name: 'Persistence',
              children: [
                {
                  type: 'file',
                  name: `${name}Repository.ts`,
                  content: this.generateRepository(name),
                },
              ],
            },
            {
              type: 'directory',
              name: 'Providers',
              children: [
                {
                  type: 'file',
                  name: `${name}ServiceProvider.ts`,
                  content: this.generateModuleServiceProvider(name, context),
                },
              ],
            },
          ],
        },
      ],
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Bootstrap File Generators
  // ─────────────────────────────────────────────────────────────

  private generateBootstrapApp(context: GeneratorContext): string {
    return `/**
 * Application Bootstrap
 *
 * Central configuration and initialization of the application.
 */

import { PlanetCore } from 'gravito-core'
import { registerProviders } from './providers'
import { registerRoutes } from './routes'

export async function createApp(): Promise<PlanetCore> {
    const core = new PlanetCore({
        config: {
            APP_NAME: '${context.name}',
        },
    })

    // Register all service providers
    await registerProviders(core)

    // Bootstrap the application
    await core.bootstrap()

    // Register routes
    registerRoutes(core.router)

    return core
}
`
  }

  private generateProvidersRegistry(_context: GeneratorContext): string {
    return `/**
 * Service Providers Registry
 *
 * Register all module service providers here.
 */

import type { PlanetCore } from 'gravito-core'
import { OrderingServiceProvider } from '../Modules/Ordering/Infrastructure/Providers/OrderingServiceProvider'
import { CatalogServiceProvider } from '../Modules/Catalog/Infrastructure/Providers/CatalogServiceProvider'

export async function registerProviders(core: PlanetCore): Promise<void> {
    // Register module providers
    core.register(new OrderingServiceProvider())
    core.register(new CatalogServiceProvider())

    // Add more providers as needed
}
`
  }

  private generateEventsRegistry(): string {
    return `/**
 * Domain Events Registry
 *
 * Register all domain event handlers here.
 */

import { EventDispatcher } from '../Shared/Infrastructure/EventBus/EventDispatcher'

export function registerEvents(dispatcher: EventDispatcher): void {
    // Register event handlers
    // dispatcher.subscribe('ordering.created', async (event) => { ... })
}
`
  }

  private generateRoutesRegistry(_context: GeneratorContext): string {
    return `/**
 * Routes Registry
 *
 * Register all module routes here.
 */

export function registerRoutes(router: any): void {
    // Health check
    router.get('/health', (c: any) => c.json({ status: 'healthy' }))

    // Ordering module
    router.get('/api/orders', (c: any) => c.json({ message: 'Order list' }))
    router.post('/api/orders', (c: any) => c.json({ message: 'Order created' }, 201))

    // Catalog module
    router.get('/api/products', (c: any) => c.json({ message: 'Product list' }))
}
`
  }

  private generateMainEntry(_context: GeneratorContext): string {
    return `/**
 * Application Entry Point
 *
 * Start the HTTP server.
 */

import { createApp } from './Bootstrap/app'

const app = await createApp()

export default app.liftoff()
`
  }

  private generateModulesConfig(): string {
    return `/**
 * Modules Configuration
 *
 * Define module boundaries and their dependencies.
 */

export default {
    modules: {
        ordering: {
            name: 'Ordering',
            description: 'Order management module',
            prefix: '/api/orders',
        },
        catalog: {
            name: 'Catalog',
            description: 'Product catalog module',
            prefix: '/api/products',
        },
    },

    // Module dependencies
    dependencies: {
        ordering: ['catalog'], // Ordering depends on Catalog
    },
}
`
  }

  private generateModuleServiceProvider(name: string, _context: GeneratorContext): string {
    return `/**
 * ${name} Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from 'gravito-core'
import { ${name}Repository } from '../Persistence/${name}Repository'

export class ${name}ServiceProvider extends ServiceProvider {
    register(container: Container): void {
        container.singleton('${name.toLowerCase()}Repository', () => new ${name}Repository())
    }

    boot(_core: PlanetCore): void {
        console.log('[${name}] Module loaded')
    }
}
`
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
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        'gravito-core': '^1.0.0-beta.5',
      },
      devDependencies: {
        '@types/bun': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  // ─────────────────────────────────────────────────────────────
  // Config Generators
  // ─────────────────────────────────────────────────────────────

  private generateAppConfig(context: GeneratorContext): string {
    return `export default {
  name: process.env.APP_NAME ?? '${context.name}',
  env: process.env.APP_ENV ?? 'development',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
}
`
  }

  private generateDatabaseConfig(): string {
    return `export default {
  default: process.env.DB_CONNECTION ?? 'sqlite',
  connections: {
    sqlite: { driver: 'sqlite', database: 'database/database.sqlite' },
  },
}
`
  }

  private generateCacheConfig(): string {
    return `export default {
  default: process.env.CACHE_DRIVER ?? 'memory',
  stores: { memory: { driver: 'memory' } },
}
`
  }

  private generateLoggingConfig(): string {
    return `export default {
  default: 'console',
  channels: { console: { driver: 'console', level: 'debug' } },
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Shared Kernel Files
  // ─────────────────────────────────────────────────────────────

  private generateIdValueObject(): string {
    return `/**
 * ID Value Object
 *
 * Shared identifier across all contexts.
 */

export class Id {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  static create(): Id {
    return new Id(crypto.randomUUID())
  }

  static from(value: string): Id {
    if (!value) throw new Error('Id cannot be empty')
    return new Id(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: Id): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
`
  }

  private generateMoneyValueObject(): string {
    return `/**
 * Money Value Object
 */

export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD'
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative')
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.amount + other.amount, this.currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.amount - other.amount, this.currency)
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Cannot operate on different currencies')
    }
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency
  }
}
`
  }

  private generateEmailValueObject(): string {
    return `/**
 * Email Value Object
 */

export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value.toLowerCase().trim()
  }

  static create(email: string): Email {
    if (!Email.isValid(email)) {
      throw new Error(\`Invalid email: \${email}\`)
    }
    return new Email(email)
  }

  static isValid(email: string): boolean {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
  }

  get value(): string {
    return this._value
  }
}
`
  }

  private generateDomainEvent(): string {
    return `/**
 * Domain Event Base
 */

export abstract class DomainEvent {
  readonly occurredOn: Date
  readonly eventId: string

  constructor() {
    this.occurredOn = new Date()
    this.eventId = crypto.randomUUID()
  }

  abstract get eventName(): string
  abstract get aggregateId(): string
}
`
  }

  private generateAggregateRoot(): string {
    return `/**
 * Aggregate Root Base
 */

import type { DomainEvent } from '../Events/DomainEvent'
import type { Id } from '../ValueObjects/Id'

export abstract class AggregateRoot<T extends Id = Id> {
  private _domainEvents: DomainEvent[] = []

  protected constructor(protected readonly _id: T) {}

  get id(): T {
    return this._id
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents]
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents]
    this._domainEvents = []
    return events
  }
}
`
  }

  private generateEntity(): string {
    return `/**
 * Entity Base
 */

import type { Id } from '../ValueObjects/Id'

export abstract class Entity<T extends Id = Id> {
  protected constructor(protected readonly _id: T) {}

  get id(): T {
    return this._id
  }

  equals(other: Entity<T>): boolean {
    return this._id.equals(other._id)
  }
}
`
  }

  private generateValueObject(): string {
    return `/**
 * Value Object Base
 */

export abstract class ValueObject<T> {
  protected readonly props: T

  constructor(props: T) {
    this.props = Object.freeze(props)
  }

  equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }
}
`
  }

  private generateEventDispatcher(): string {
    return `/**
 * Event Dispatcher
 */

import type { DomainEvent } from '../../Domain/Events/DomainEvent'

type EventHandler = (event: DomainEvent) => void | Promise<void>

export class EventDispatcher {
  private handlers: Map<string, EventHandler[]> = new Map()

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) ?? []
    handlers.push(handler)
    this.handlers.set(eventName, handlers)
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event)
    }
  }
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Bounded Context Templates
  // ─────────────────────────────────────────────────────────────

  private generateAggregate(name: string): string {
    return `/**
 * ${name} Aggregate Root
 */

import { AggregateRoot } from '../../../../../Shared/Domain/Primitives/AggregateRoot'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'
import { ${name}Created } from '../../Events/${name}Created'
import { ${name}Status } from './${name}Status'

export interface ${name}Props {
  // Add properties here
  status: ${name}Status
  createdAt: Date
}

export class ${name} extends AggregateRoot {
  private props: ${name}Props

  private constructor(id: Id, props: ${name}Props) {
    super(id)
    this.props = props
  }

  static create(id: Id): ${name} {
    const aggregate = new ${name}(id, {
      status: ${name}Status.PENDING,
      createdAt: new Date(),
    })

    aggregate.addDomainEvent(new ${name}Created(id.value))

    return aggregate
  }

  get status(): ${name}Status {
    return this.props.status
  }

  // Add domain methods here
}
`
  }

  private generateAggregateStatus(name: string): string {
    return `/**
 * ${name} Status
 */

export enum ${name}Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
`
  }

  private generateCreatedEvent(name: string): string {
    return `/**
 * ${name} Created Event
 */

import { DomainEvent } from '../../../../Shared/Domain/Events/DomainEvent'

export class ${name}Created extends DomainEvent {
  constructor(public readonly ${name.toLowerCase()}Id: string) {
    super()
  }

  get eventName(): string {
    return '${name.toLowerCase()}.created'
  }

  get aggregateId(): string {
    return this.${name.toLowerCase()}Id
  }
}
`
  }

  private generateRepositoryInterface(name: string): string {
    return `/**
 * ${name} Repository Interface
 */

import type { ${name} } from '../Aggregates/${name}/${name}'

export interface I${name}Repository {
  findById(id: string): Promise<${name} | null>
  save(aggregate: ${name}): Promise<void>
  delete(id: string): Promise<void>
}
`
  }

  private generateCommand(name: string): string {
    return `/**
 * Create ${name} Command
 */

export class Create${name}Command {
  constructor(
    // Add command properties
    public readonly id?: string
  ) {}
}
`
  }

  private generateCommandHandler(name: string): string {
    return `/**
 * Create ${name} Handler
 */

import type { I${name}Repository } from '../../../Domain/Repositories/I${name}Repository'
import { ${name} } from '../../../Domain/Aggregates/${name}/${name}'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'
import type { Create${name}Command } from './Create${name}Command'

export class Create${name}Handler {
  constructor(private repository: I${name}Repository) {}

  async handle(command: Create${name}Command): Promise<string> {
    const id = command.id ? Id.from(command.id) : Id.create()
    const aggregate = ${name}.create(id)

    await this.repository.save(aggregate)

    return id.value
  }
}
`
  }

  private generateQuery(name: string): string {
    return `/**
 * Get ${name} By Id Query
 */

export class Get${name}ByIdQuery {
  constructor(public readonly id: string) {}
}
`
  }

  private generateQueryHandler(name: string): string {
    return `/**
 * Get ${name} By Id Handler
 */

import type { I${name}Repository } from '../../../Domain/Repositories/I${name}Repository'
import type { ${name}DTO } from '../../DTOs/${name}DTO'
import type { Get${name}ByIdQuery } from './Get${name}ByIdQuery'

export class Get${name}ByIdHandler {
  constructor(private repository: I${name}Repository) {}

  async handle(query: Get${name}ByIdQuery): Promise<${name}DTO | null> {
    const aggregate = await this.repository.findById(query.id)
    if (!aggregate) return null

    return {
      id: aggregate.id.value,
      status: aggregate.status,
    }
  }
}
`
  }

  private generateDTO(name: string): string {
    return `/**
 * ${name} DTO
 */

import type { ${name}Status } from '../../Domain/Aggregates/${name}/${name}Status'

export interface ${name}DTO {
  id: string
  status: ${name}Status
  // Add more fields
}
`
  }

  private generateRepository(name: string): string {
    return `/**
 * ${name} Repository Implementation
 */

import type { ${name} } from '../../Domain/Aggregates/${name}/${name}'
import type { I${name}Repository } from '../../Domain/Repositories/I${name}Repository'

const store = new Map<string, ${name}>()

export class ${name}Repository implements I${name}Repository {
  async findById(id: string): Promise<${name} | null> {
    return store.get(id) ?? null
  }

  async save(aggregate: ${name}): Promise<void> {
    store.set(aggregate.id.value, aggregate)
  }

  async delete(id: string): Promise<void> {
    store.delete(id)
  }
}
`
  }

  private generateExceptionHandler(): string {
    return `/**
 * Exception Handler
 */

export function report(error: unknown): void {
  console.error('[Exception]', error)
}
`
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name} - DDD Architecture Guide

## Overview

This project follows **Domain-Driven Design (DDD)** with strategic and tactical patterns.

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
Context/
├── Domain/              # Core business logic
│   ├── Aggregates/     # Aggregate roots + entities
│   ├── Events/         # Domain events
│   ├── Repositories/   # Repository interfaces
│   └── Services/       # Domain services
├── Application/        # Use cases
│   ├── Commands/       # Write operations
│   ├── Queries/        # Read operations
│   ├── EventHandlers/  # Event reactions
│   └── DTOs/           # Data transfer objects
├── Infrastructure/     # External concerns
│   ├── Persistence/    # Repository implementations
│   └── Providers/      # DI configuration
└── UserInterface/      # Entry points
    ├── Http/           # REST controllers
    └── Cli/            # CLI commands
\`\`\`

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

Created with ❤️ using Gravito Framework
`
  }
}
