/**
 * SatelliteGenerator - Scaffolds Gravito Satellites (Plugins)
 *
 * Implements DDD + Clean Architecture for plugins with built-in
 * Dogfooding support (pre-configured with Gravito modules).
 */

import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorContext } from './BaseGenerator'

/**
 * SatelliteGenerator scaffolds modular plug-and-play extensions for Gravito.
 *
 * It follows a strict DDD and Clean Architecture pattern to ensure that
 * satellites remain decoupled from the core framework and other satellites.
 *
 * @public
 * @since 3.0.0
 */
export class SatelliteGenerator extends BaseGenerator {
  get architectureType() {
    return 'satellite' as const
  }

  get displayName(): string {
    return 'Gravito Satellite'
  }

  get description(): string {
    return 'A modular plugin for Gravito following DDD and Clean Architecture'
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    const name = context.namePascalCase

    return [
      {
        type: 'directory',
        name: 'src',
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
                  { type: 'file', name: `${name}.ts`, content: this.generateAggregate(name) },
                ],
              },
              {
                type: 'directory',
                name: 'Contracts',
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
                name: 'ValueObjects',
                children: [
                  { type: 'file', name: `${name}Id.ts`, content: this.generateIdValueObject(name) },
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
            ],
          },
          // Application Layer
          {
            type: 'directory',
            name: 'Application',
            children: [
              {
                type: 'directory',
                name: 'UseCases',
                children: [
                  {
                    type: 'file',
                    name: `Create${name}.ts`,
                    content: this.generateUseCase(name),
                  },
                ],
              },
              { type: 'directory', name: 'DTOs', children: [] },
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
                    name: `Atlas${name}Repository.ts`,
                    content: this.generateAtlasRepository(name),
                  },
                  { type: 'directory', name: 'Migrations', children: [] },
                ],
              },
            ],
          },
          // Entry Point
          { type: 'file', name: 'index.ts', content: this.generateEntryPoint(name) },
          {
            type: 'file',
            name: 'env.d.ts',
            content: 'interface ImportMeta {\n  readonly dir: string\n  readonly path: string\n}\n',
          },
          { type: 'file', name: 'manifest.json', content: this.generateManifest(context) },
        ],
      },
      {
        type: 'directory',
        name: 'tests',
        children: [
          {
            type: 'file',
            name: 'unit.test.ts',
            content: this.generateUnitTest(name),
          },
          {
            type: 'file',
            name: 'integration.test.ts',
            content: this.generateIntegrationTest(name),
          },
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────
  // Domain Templates
  // ─────────────────────────────────────────────────────────────

  private generateIdValueObject(name: string): string {
    return `import { ValueObject } from '@gravito/enterprise'\n\ninterface IdProps {\n  value: string\n}\n\nexport class ${name}Id extends ValueObject<IdProps> {\n  constructor(value: string) {\n    super({ value })\n  }\n\n  static create(): ${name}Id {\n    return new ${name}Id(crypto.randomUUID())\n  }\n\n  get value(): string { return this.props.value }\n}\n`
  }

  private generateAggregate(name: string): string {
    return `import { AggregateRoot } from '@gravito/enterprise'\nimport { ${name}Id } from '../ValueObjects/${name}Id'\nimport { ${name}Created } from '../Events/${name}Created'\n\nexport interface ${name}Props {\n  name: string\n  createdAt: Date\n}\n\nexport class ${name} extends AggregateRoot<${name}Id> {\n  constructor(id: ${name}Id, private props: ${name}Props) {\n    super(id)\n  }\n\n  static create(id: ${name}Id, name: string): ${name} {\n    const aggregate = new ${name}(id, {\n      name,\n      createdAt: new Date()\n    })\n\n    aggregate.addDomainEvent(new ${name}Created(id.value))\n\n    return aggregate\n  }\n\n  get name() { return this.props.name }\n}\n`
  }

  private generateCreatedEvent(name: string): string {
    return `import { DomainEvent } from '@gravito/enterprise'\n\nexport class ${name}Created extends DomainEvent {\n  constructor(public readonly aggregateId: string) {\n    super()\n  }\n\n  get eventName(): string {\n    return '${this.context?.nameKebabCase}.created'\n  }\n}\n`
  }

  private generateRepositoryInterface(name: string): string {
    return `import { Repository } from '@gravito/enterprise'\nimport { ${name} } from '../Aggregates/${name}'\nimport { ${name}Id } from '../ValueObjects/${name}Id'\n\nexport interface I${name}Repository extends Repository<${name}, ${name}Id> {\n  // Add custom methods here\n}\n`
  }

  // ─────────────────────────────────────────────────────────────
  // Application Templates
  // ─────────────────────────────────────────────────────────────

  private generateUseCase(name: string): string {
    return `import { UseCase } from '@gravito/enterprise'\nimport { I${name}Repository } from '../../Domain/Contracts/I${name}Repository'\nimport { ${name} } from '../../Domain/Aggregates/${name}'\nimport { ${name}Id } from '../../Domain/ValueObjects/${name}Id'\n\nexport interface Create${name}Input {\n  name: string\n}\n\nexport class Create${name} extends UseCase<Create${name}Input, string> {\n  constructor(private repository: I${name}Repository) {\n    super()\n  }\n\n  async execute(input: Create${name}Input): Promise<string> {\n    const id = ${name}Id.create()\n    const entity = ${name}.create(id, input.name)\n    \n    await this.repository.save(entity)\n    \n    return id.value\n  }\n}\n`
  }

  // ─────────────────────────────────────────────────────────────
  // Infrastructure Templates (Dogfooding Atlas)
  // ─────────────────────────────────────────────────────────────

  private generateAtlasRepository(name: string): string {
    return `import { I${name}Repository } from '../../Domain/Contracts/I${name}Repository'\nimport { ${name} } from '../../Domain/Aggregates/${name}'\nimport { ${name}Id } from '../../Domain/ValueObjects/${name}Id'\n\nexport class Atlas${name}Repository implements I${name}Repository {\n  async save(entity: ${name}): Promise<void> {\n    // Implementation using @gravito/atlas\n    console.log('[Atlas] Saving aggregate:', entity.id.value)\n  }\n\n  async findById(id: ${name}Id): Promise<${name} | null> {\n    return null\n  }\n\n  async findAll(): Promise<${name}[]> {\n    return []\n  }\n\n  async delete(id: ${name}Id): Promise<void> {}\n\n  async exists(id: ${name}Id): Promise<boolean> {\n    return false\n  }\n}\n`
  }

  // ─────────────────────────────────────────────────────────────
  // Test Templates
  // ─────────────────────────────────────────────────────────────

  private generateUnitTest(name: string): string {
    return `import { describe, it, expect } from "bun:test";\nimport { ${name} } from "../src/Domain/Aggregates/${name}";\nimport { ${name}Id } from "../src/Domain/ValueObjects/${name}Id";\n\ndescribe("${name} Aggregate", () => {\n  it("should create a new aggregate with a domain event", () => {\n    const id = ${name}Id.create();\n    const aggregate = ${name}.create(id, "Test Name");\n\n    expect(aggregate.id).toBe(id);\n    expect(aggregate.name).toBe("Test Name");\n    expect(aggregate.pullDomainEvents()).toHaveLength(1);\n  });\n});`
  }

  private generateIntegrationTest(name: string): string {
    return `import { describe, it, expect, beforeAll } from "bun:test";\nimport { PlanetCore } from "@gravito/core";\n\ndescribe("${name} Integration", () => {\n  let core: PlanetCore;\n\n  beforeAll(async () => {\n    core = new PlanetCore();\n    // Setup dependencies here\n  });\n\n  it("should handle the creation flow", async () => {\n    expect(true).toBe(true); // Placeholder for actual integration logic\n  });\n});`
  }

  // ─────────────────────────────────────────────────────────────
  // Entry Point & Manifest
  // ─────────────────────────────────────────────────────────────

  private generateEntryPoint(name: string): string {
    return `import { ServiceProvider, type Container } from '@gravito/core'\nimport { Atlas${name}Repository } from './Infrastructure/Persistence/Atlas${name}Repository'\n\nexport class ${name}ServiceProvider extends ServiceProvider {\n  register(container: Container): void {\n    // Bind Repository\n    container.singleton('${name.toLowerCase()}.repo', () => new Atlas${name}Repository())\n    \n    // Bind UseCases\n    container.singleton('${name.toLowerCase()}.create', () => {\n        return new (require('./Application/UseCases/Create${name}').Create${name})(\n            container.make('${name.toLowerCase()}.repo')\n        )\n    })\n  }\n\n  boot(): void {\n    this.core?.logger.info('🛰️ Satellite ${name} is operational')\n  }\n}\n`
  }

  private generateManifest(context: GeneratorContext): string {
    return JSON.stringify(
      {
        name: context.name,
        id: context.nameKebabCase,
        version: '0.1.0',
        description: context.description || 'A Gravito Satellite',
        capabilities: [`create-${context.nameKebabCase}`],
        requirements: [
          'cache', // Example requirement
        ],
        hooks: [`${context.nameKebabCase}:created`],
      },
      null,
      2
    )
  }

  protected override generatePackageJson(context: GeneratorContext): string {
    const isInternal = context.isInternal || false

    // 官方插件使用 workspace 依賴，外部插件使用 npm 版本
    const depVersion = isInternal ? 'workspace:*' : '^1.0.0-beta.1'

    const pkg = {
      name: isInternal
        ? `@gravito/satellite-${context.nameKebabCase}`
        : `gravito-satellite-${context.nameKebabCase}`,
      version: '0.1.0',
      type: 'module',
      main: 'dist/index.js',
      module: 'dist/index.mjs',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsup src/index.ts --format esm --dts',
        test: 'bun test',
        typecheck: 'bun tsc --noEmit',
      },
      dependencies: {
        '@gravito/core': depVersion,
        '@gravito/enterprise': depVersion,
        '@gravito/atlas': depVersion,
        '@gravito/stasis': depVersion,
      },
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.9.3',
        tsup: '^8.0.0',
      },
      peerDependencies: {
        '@gravito/core': '>=1.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name} Satellite Architecture

This satellite follows the Gravito Satellite Specification v1.0.

## Design
- **DDD**: Domain logic is separated from framework concerns.
- **Dogfooding**: Uses official Gravito modules (@gravito/atlas, @gravito/stasis).
- **Decoupled**: Inter-satellite communication happens via Contracts and Events.

## Layers
- **Domain**: Pure business rules.
- **Application**: Orchestration of domain tasks.
- **Infrastructure**: Implementation of persistence and external services.
- **Interface**: HTTP and Event entry points.
`
  }
}
