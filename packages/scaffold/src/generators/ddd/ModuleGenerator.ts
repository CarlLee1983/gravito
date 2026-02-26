import type { DirectoryNode } from '../../types'
import type { GeneratorContext } from '../BaseGenerator'

export class ModuleGenerator {
  generate(name: string, context: GeneratorContext): DirectoryNode {
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

  private generateAggregate(name: string): string {
    return `/**
 * ${name} Aggregate Root
 */

import { AggregateRoot } from '@gravito/enterprise'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'
import { ${name}Created } from '../../Events/${name}Created'
import { ${name}Status } from './${name}Status'

export interface ${name}Props {
  status: ${name}Status
  createdAt: Date
}

export class ${name} extends AggregateRoot<Id> {
  private constructor(id: Id, private props: ${name}Props) {
    super(id)
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

  /**
   * Complete the ${name} process
   */
  complete(): void {
    this.props.status = ${name}Status.COMPLETED
  }
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

import { DomainEvent } from '@gravito/enterprise'

export class ${name}Created extends DomainEvent {
  constructor(public readonly aggregateId: string) {
    super()
  }

  override get eventName(): string {
    return '${name.toLowerCase()}.created'
  }
}
`
  }

  private generateRepositoryInterface(name: string): string {
    return `/**
 * ${name} Repository Interface
 */

import { Repository } from '@gravito/enterprise'
import type { ${name} } from '../Aggregates/${name}/${name}'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'

export interface I${name}Repository extends Repository<${name}, Id> {
    // Add specific methods for this repository if needed
}
`
  }

  private generateCommand(name: string): string {
    return `/**
 * Create ${name} Command
 */

import { Command } from '@gravito/enterprise'

export class Create${name}Command extends Command {
  constructor(
    public readonly id?: string
  ) {
    super()
  }
}
`
  }

  private generateCommandHandler(name: string): string {
    return `/**
 * Create ${name} Handler
 */

import { CommandHandler } from '@gravito/enterprise'
import type { I${name}Repository } from '../../../Domain/Repositories/I${name}Repository'
import { ${name} } from '../../../Domain/Aggregates/${name}/${name}'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'
import type { Create${name}Command } from './Create${name}Command'

export class Create${name}Handler implements CommandHandler<Create${name}Command, string> {
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

import { Query } from '@gravito/enterprise'

export class Get${name}ByIdQuery extends Query {
  constructor(public readonly id: string) {
    super()
  }
}
`
  }

  private generateQueryHandler(name: string): string {
    return `/**
 * Get ${name} By Id Handler
 */

import { QueryHandler } from '@gravito/enterprise'
import type { I${name}Repository } from '../../../Domain/Repositories/I${name}Repository'
import type { ${name}DTO } from '../../DTOs/${name}DTO'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'
import type { Get${name}ByIdQuery } from './Get${name}ByIdQuery'

export class Get${name}ByIdHandler implements QueryHandler<Get${name}ByIdQuery, ${name}DTO | null> {
  constructor(private repository: I${name}Repository) {}

  async handle(query: Get${name}ByIdQuery): Promise<${name}DTO | null> {
    const id = Id.from(query.id)
    const aggregate = await this.repository.findById(id)
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
}
`
  }

  private generateRepository(name: string): string {
    return `/**
 * ${name} Repository Implementation
 */

import type { ${name} } from '../../Domain/Aggregates/${name}/${name}'
import type { I${name}Repository } from '../../Domain/Repositories/I${name}Repository'
import { Id } from '../../../../../Shared/Domain/ValueObjects/Id'

export class ${name}Repository implements I${name}Repository {
  private store = new Map<string, ${name}>()

  async findById(id: Id): Promise<${name} | null> {
    return this.store.get(id.value) ?? null
  }

  async save(aggregate: ${name}): Promise<void> {
    this.store.set(aggregate.id.value, aggregate)
  }

  async delete(id: Id): Promise<void> {
    this.store.delete(id.value)
  }

  async findAll(): Promise<${name}[]> {
    return Array.from(this.store.values())
  }

  async exists(id: Id): Promise<boolean> {
    return this.store.has(id.value)
  }
}
`
  }

  private generateModuleServiceProvider(name: string, _context: GeneratorContext): string {
    return `/**
 * ${name} Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
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
}
