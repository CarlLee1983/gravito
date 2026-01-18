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
import { BootstrapGenerator } from './ddd/BootstrapGenerator'
import { ModuleGenerator } from './ddd/ModuleGenerator'
import { SharedKernelGenerator } from './ddd/SharedKernelGenerator'

/**
 * DddGenerator implements the full Domain-Driven Design (DDD) architectural pattern.
 *
 * It generates a sophisticated structure including Bounded Contexts, Aggregates,
 * Value Objects, Domain Events, and a Shared Kernel. It is ideal for complex
 * enterprise applications with rich business logic.
 *
 * @public
 * @since 3.0.0
 */
export class DddGenerator extends BaseGenerator {
  private moduleGenerator: ModuleGenerator
  private sharedKernelGenerator: SharedKernelGenerator
  private bootstrapGenerator: BootstrapGenerator

  constructor(config: GeneratorConfig) {
    super(config)
    this.moduleGenerator = new ModuleGenerator()
    this.sharedKernelGenerator = new SharedKernelGenerator()
    this.bootstrapGenerator = new BootstrapGenerator()
  }

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
              this.moduleGenerator.generate('Ordering', context),
              this.moduleGenerator.generate('Catalog', context),
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
