/**
 * CleanArchitectureGenerator - Clean Architecture Generator
 *
 * Generates a structure following Uncle Bob's Clean Architecture:
 * - Domain: Entities, Value Objects, Interfaces (pure business logic)
 * - Application: Use Cases, DTOs
 * - Infrastructure: Database, External Services
 * - Interface: HTTP Controllers, Presenters
 */

import type { DirectoryNode } from '../types'
import { BaseGenerator, type GeneratorContext } from './BaseGenerator'

export class CleanArchitectureGenerator extends BaseGenerator {
  get architectureType() {
    return 'clean' as const
  }

  get displayName(): string {
    return 'Clean Architecture'
  }

  get description(): string {
    return "Uncle Bob's Clean Architecture with strict dependency rules and pure domain layer"
  }

  getDirectoryStructure(context: GeneratorContext): DirectoryNode[] {
    return [
      {
        type: 'directory',
        name: 'config',
        children: [
          { type: 'file', name: 'app.ts', content: this.generateAppConfig(context) },
          { type: 'file', name: 'database.ts', content: this.generateDatabaseConfig() },
          { type: 'file', name: 'auth.ts', content: this.generateAuthConfig() },
          { type: 'file', name: 'cache.ts', content: this.generateCacheConfig() },
          { type: 'file', name: 'logging.ts', content: this.generateLoggingConfig() },
        ],
      },
      {
        type: 'directory',
        name: 'src',
        children: [
          // Domain Layer (innermost - no dependencies)
          {
            type: 'directory',
            name: 'Domain',
            children: [
              {
                type: 'directory',
                name: 'Entities',
                children: [{ type: 'file', name: 'User.ts', content: this.generateUserEntity() }],
              },
              {
                type: 'directory',
                name: 'ValueObjects',
                children: [
                  { type: 'file', name: 'Email.ts', content: this.generateEmailValueObject() },
                ],
              },
              {
                type: 'directory',
                name: 'Interfaces',
                children: [
                  {
                    type: 'file',
                    name: 'IUserRepository.ts',
                    content: this.generateUserRepositoryInterface(),
                  },
                ],
              },
              {
                type: 'directory',
                name: 'Exceptions',
                children: [{ type: 'file', name: '.gitkeep', content: '' }],
              },
            ],
          },
          // Application Layer (use cases)
          {
            type: 'directory',
            name: 'Application',
            children: [
              {
                type: 'directory',
                name: 'UseCases',
                children: [
                  {
                    type: 'directory',
                    name: 'User',
                    children: [
                      {
                        type: 'file',
                        name: 'CreateUser.ts',
                        content: this.generateCreateUserUseCase(),
                      },
                      { type: 'file', name: 'GetUser.ts', content: this.generateGetUserUseCase() },
                    ],
                  },
                ],
              },
              {
                type: 'directory',
                name: 'DTOs',
                children: [{ type: 'file', name: 'UserDTO.ts', content: this.generateUserDTO() }],
              },
              {
                type: 'directory',
                name: 'Interfaces',
                children: [
                  {
                    type: 'file',
                    name: 'IMailService.ts',
                    content: this.generateMailServiceInterface(),
                  },
                ],
              },
            ],
          },
          // Infrastructure Layer (external implementations)
          {
            type: 'directory',
            name: 'Infrastructure',
            children: [
              {
                type: 'directory',
                name: 'Persistence',
                children: [
                  {
                    type: 'directory',
                    name: 'Repositories',
                    children: [
                      {
                        type: 'file',
                        name: 'UserRepository.ts',
                        content: this.generateUserRepository(),
                      },
                    ],
                  },
                  {
                    type: 'directory',
                    name: 'Migrations',
                    children: [{ type: 'file', name: '.gitkeep', content: '' }],
                  },
                ],
              },
              {
                type: 'directory',
                name: 'ExternalServices',
                children: [
                  { type: 'file', name: 'MailService.ts', content: this.generateMailService() },
                ],
              },
              {
                type: 'directory',
                name: 'Providers',
                children: [
                  {
                    type: 'file',
                    name: 'AppServiceProvider.ts',
                    content: this.generateAppServiceProvider(context),
                  },
                  {
                    type: 'file',
                    name: 'RepositoryServiceProvider.ts',
                    content: this.generateRepositoryServiceProvider(),
                  },
                ],
              },
            ],
          },
          // Interface Layer (controllers, presenters)
          {
            type: 'directory',
            name: 'Interface',
            children: [
              {
                type: 'directory',
                name: 'Http',
                children: [
                  {
                    type: 'directory',
                    name: 'Controllers',
                    children: [
                      {
                        type: 'file',
                        name: 'UserController.ts',
                        content: this.generateUserController(),
                      },
                    ],
                  },
                  {
                    type: 'directory',
                    name: 'Middleware',
                    children: [{ type: 'file', name: '.gitkeep', content: '' }],
                  },
                  {
                    type: 'directory',
                    name: 'Routes',
                    children: [{ type: 'file', name: 'api.ts', content: this.generateApiRoutes() }],
                  },
                ],
              },
              {
                type: 'directory',
                name: 'Presenters',
                children: [
                  { type: 'file', name: 'UserPresenter.ts', content: this.generateUserPresenter() },
                ],
              },
            ],
          },
          { type: 'file', name: 'bootstrap.ts', content: this.generateBootstrap(context) },
        ],
      },
      {
        type: 'directory',
        name: 'tests',
        children: [
          {
            type: 'directory',
            name: 'Unit',
            children: [
              {
                type: 'directory',
                name: 'Domain',
                children: [{ type: 'file', name: '.gitkeep', content: '' }],
              },
              {
                type: 'directory',
                name: 'Application',
                children: [{ type: 'file', name: '.gitkeep', content: '' }],
              },
            ],
          },
          {
            type: 'directory',
            name: 'Integration',
            children: [{ type: 'file', name: '.gitkeep', content: '' }],
          },
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────
  // Config Generators (similar to MVC but simplified)
  // ─────────────────────────────────────────────────────────────

  private generateAppConfig(context: GeneratorContext): string {
    return `export default {
  name: process.env.APP_NAME ?? '${context.name}',
  env: process.env.APP_ENV ?? 'development',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  key: process.env.APP_KEY,
}
`
  }

  private generateDatabaseConfig(): string {
    return `export default {
  default: process.env.DB_CONNECTION ?? 'sqlite',
  connections: {
    sqlite: {
      driver: 'sqlite',
      database: process.env.DB_DATABASE ?? 'database/database.sqlite',
    },
  },
}
`
  }

  private generateAuthConfig(): string {
    return `export default {
  defaults: { guard: 'web' },
  guards: {
    web: { driver: 'session', provider: 'users' },
    api: { driver: 'token', provider: 'users' },
  },
}
`
  }

  private generateCacheConfig(): string {
    return `export default {
  default: process.env.CACHE_DRIVER ?? 'memory',
  stores: {
    memory: { driver: 'memory' },
  },
}
`
  }

  private generateLoggingConfig(): string {
    return `export default {
  default: process.env.LOG_CHANNEL ?? 'console',
  channels: {
    console: { driver: 'console', level: process.env.LOG_LEVEL ?? 'debug' },
  },
}
`
  }

  private generateUserEntity(): string {
    return `/**
 * User Entity
 *
 * Core domain entity representing a user.
 * Contains business logic related to users.
 */

import { Entity } from '@gravito/enterprise'
import { Email } from '../ValueObjects/Email'

export interface UserProps {
  name: string
  email: Email
  createdAt: Date
  updatedAt?: Date
}

export class User extends Entity<string> {
  private props: UserProps

  private constructor(id: string, props: UserProps) {
    super(id)
    this.props = props
  }

  static create(id: string, name: string, email: string): User {
    return new User(id, {
      name,
      email: Email.create(email),
      createdAt: new Date(),
    })
  }

  static reconstitute(id: string, props: UserProps): User {
    return new User(id, props)
  }

  get name(): string {
    return this.props.name
  }

  get email(): Email {
    return this.props.email
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name cannot be empty')
    }
    this.props.name = name.trim()
    this.props.updatedAt = new Date()
  }
}
`
  }

  private generateEmailValueObject(): string {
    return `/**
 * Email Value Object
 *
 * Encapsulates email validation and comparison.
 */

import { ValueObject } from '@gravito/enterprise'

interface EmailProps {
  value: string
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props)
  }

  static create(email: string): Email {
    if (!Email.isValid(email)) {
      throw new Error(\`Invalid email: \${email}\`)
    }
    return new Email({ value: email.toLowerCase().trim() })
  }

  static isValid(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    return emailRegex.test(email)
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.value
  }
}
`
  }

  private generateUserRepositoryInterface(): string {
    return `/**
 * User Repository Interface
 *
 * Defines the contract for user persistence.
 * Implementations are in Infrastructure layer.
 */

import type { Repository } from '@gravito/enterprise'
import type { User } from '../Entities/User'

export interface IUserRepository extends Repository<User, string> {
  findByEmail(email: string): Promise<User | null>
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Application Layer
  // ─────────────────────────────────────────────────────────────

  private generateCreateUserUseCase(): string {
    return `/**
 * Create User Use Case
 *
 * Application service for creating new users.
 */

import { UseCase } from '@gravito/enterprise'
import { User } from '../../../Domain/Entities/User'
import type { IUserRepository } from '../../../Domain/Interfaces/IUserRepository'
import type { UserDTO } from '../../DTOs/UserDTO'

export interface CreateUserInput {
  name: string
  email: string
}

export interface CreateUserOutput {
  user: UserDTO
}

export class CreateUserUseCase extends UseCase<CreateUserInput, CreateUserOutput> {
  constructor(private userRepository: IUserRepository) {
    super()
  }

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    // Check if email already exists
    const existing = await this.userRepository.findByEmail(input.email)
    if (existing) {
      throw new Error('User with this email already exists')
    }

    // Create user entity
    const user = User.create(
      crypto.randomUUID(),
      input.name,
      input.email
    )

    // Persist
    await this.userRepository.save(user)

    // Return DTO
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        createdAt: user.createdAt.toISOString(),
      },
    }
  }
}
`
  }

  private generateGetUserUseCase(): string {
    return `/**
 * Get User Use Case
 */

import { UseCase } from '@gravito/enterprise'
import type { IUserRepository } from '../../../Domain/Interfaces/IUserRepository'
import type { UserDTO } from '../../DTOs/UserDTO'

export interface GetUserInput {
  id: string
}

export interface GetUserOutput {
  user: UserDTO
}

export class GetUserUseCase extends UseCase<GetUserInput, GetUserOutput> {
  constructor(private userRepository: IUserRepository) {
    super()
  }

  async execute(input: GetUserInput): Promise<GetUserOutput> {
    const user = await this.userRepository.findById(input.id)

    if (!user) {
      throw new Error(\`User with id \${input.id} not found\`)
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        createdAt: user.createdAt.toISOString(),
      },
    }
  }
}
`
  }

  private generateUserDTO(): string {
    return `/**
 * User Data Transfer Object
 *
 * Used for transferring user data across boundaries.
 */

export interface UserDTO {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt?: string
}

export interface CreateUserDTO {
  name: string
  email: string
}

export interface UpdateUserDTO {
  name?: string
  email?: string
}
`
  }

  private generateMailServiceInterface(): string {
    return `/**
 * Mail Service Interface
 *
 * Contract for email sending functionality.
 */

export interface MailMessage {
  to: string
  subject: string
  body: string
  html?: string
}

export interface IMailService {
  send(message: MailMessage): Promise<void>
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Infrastructure Layer
  // ─────────────────────────────────────────────────────────────

  private generateUserRepository(): string {
    return `/**
 * User Repository Implementation
 *
 * Concrete implementation of IUserRepository.
 */

import type { User } from '../../../Domain/Entities/User'
import type { IUserRepository } from '../../../Domain/Interfaces/IUserRepository'

// In-memory store for demo purposes
const users = new Map<string, User>()

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return users.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of users.values()) {
      if (user.email.value === email) {
        return user
      }
    }
    return null
  }

  async save(user: User): Promise<void> {
    users.set(user.id, user)
  }

  async delete(id: string): Promise<void> {
    users.delete(id)
  }

  async findAll(): Promise<User[]> {
    return Array.from(users.values())
  }

  async exists(id: string): Promise<boolean> {
    return users.has(id)
  }
}
`
  }

  private generateMailService(): string {
    return `/**
 * Mail Service Implementation
 */

import type { IMailService, MailMessage } from '../../Application/Interfaces/IMailService'

export class MailService implements IMailService {
  async send(message: MailMessage): Promise<void> {
    // TODO: Implement actual email sending
    console.log(\`[Mail] Sending to \${message.to}: \${message.subject}\`)
  }
}
`
  }

  private generateAppServiceProvider(context: GeneratorContext): string {
    return `/**
 * App Service Provider
 */

import { ServiceProvider, type Container, type PlanetCore } from 'gravito-core'

export class AppServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // Register application services
  }

  boot(_core: PlanetCore): void {
    console.log('${context.name} (Clean Architecture) booted!')
  }
}
`
  }

  private generateRepositoryServiceProvider(): string {
    return `/**
 * Repository Service Provider
 *
 * Binds repository interfaces to implementations.
 */

import { ServiceProvider, type Container } from 'gravito-core'
import { UserRepository } from '../Persistence/Repositories/UserRepository'
import { MailService } from '../ExternalServices/MailService'

export class RepositoryServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // Bind repositories
    container.singleton('userRepository', () => new UserRepository())

    // Bind external services
    container.singleton('mailService', () => new MailService())
  }
}
`
  }

  // ─────────────────────────────────────────────────────────────
  // Interface Layer
  // ─────────────────────────────────────────────────────────────

  private generateUserController(): string {
    return `/**
 * User Controller
 */

import type { GravitoContext } from 'gravito-core'
import { CreateUserUseCase } from '../../../Application/UseCases/User/CreateUser'
import { GetUserUseCase } from '../../../Application/UseCases/User/GetUser'
import { UserRepository } from '../../../Infrastructure/Persistence/Repositories/UserRepository'

const userRepository = new UserRepository()

export class UserController {
  async create(c: GravitoContext) {
    const body = await c.req.json() as { name: string; email: string }
    const useCase = new CreateUserUseCase(userRepository)

    const result = await useCase.execute({
      name: body.name,
      email: body.email,
    })

    return c.json({ success: true, data: result.user }, 201)
  }

  async show(c: GravitoContext) {
    const id = c.req.param('id') ?? ''
    const useCase = new GetUserUseCase(userRepository)

    const result = await useCase.execute({ id })

    return c.json({ success: true, data: result.user })
  }
}
`
  }

  private generateApiRoutes(): string {
    return `/**
 * API Routes
 */

import { UserController } from '../Controllers/UserController'

export function registerApiRoutes(router: any): void {
  const users = new UserController()

  router.post('/api/users', (c: any) => users.create(c))
  router.get('/api/users/:id', (c: any) => users.show(c))
}
`
  }

  private generateUserPresenter(): string {
    return `/**
 * User Presenter
 *
 * Formats user data for different output formats.
 */

import type { UserDTO } from '../../Application/DTOs/UserDTO'

export class UserPresenter {
  static toJson(user: UserDTO): object {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    }
  }

  static toList(users: UserDTO[]): object {
    return {
      data: users.map((u) => this.toJson(u)),
      total: users.length,
    }
  }
}
`
  }

  private generateBootstrap(context: GeneratorContext): string {
    return `/**
 * Application Bootstrap
 */

import { PlanetCore } from 'gravito-core'
import { AppServiceProvider } from './Infrastructure/Providers/AppServiceProvider'
import { RepositoryServiceProvider } from './Infrastructure/Providers/RepositoryServiceProvider'
import { registerApiRoutes } from './Interface/Http/Routes/api'

const core = new PlanetCore({
  config: { APP_NAME: '${context.name}' },
})

core.register(new RepositoryServiceProvider())
core.register(new AppServiceProvider())

await core.bootstrap()

// Register routes
registerApiRoutes(core.router)

export default core.liftoff()
`
  }

  protected generateArchitectureDoc(context: GeneratorContext): string {
    return `# ${context.name} - Clean Architecture Guide

## Overview

This project follows **Clean Architecture** (by Robert C. Martin).
The key principle is the **Dependency Rule**: dependencies point inward.

## Layer Structure

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Interface Layer                      │
│              (Controllers, Presenters)                  │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                    │
│          (Repositories, External Services)              │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                      │
│                (Use Cases, DTOs)                        │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                         │
│        (Entities, Value Objects, Interfaces)            │
│                   ⭐ PURE ⭐                             │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Dependency Rule

> Inner layers know nothing about outer layers.

- **Domain**: No dependencies (pure TypeScript only)
- **Application**: Depends only on Domain
- **Infrastructure**: Implements Domain interfaces
- **Interface**: Calls Application use cases

## Directory Structure

\`\`\`
src/
├── Domain/                 # Enterprise Business Rules
│   ├── Entities/          # Business objects with identity
│   ├── ValueObjects/      # Immutable value types
│   ├── Interfaces/        # Repository contracts
│   └── Exceptions/        # Domain errors
├── Application/           # Application Business Rules
│   ├── UseCases/          # Business operations
│   ├── DTOs/              # Data transfer objects
│   └── Interfaces/        # Service contracts
├── Infrastructure/        # Frameworks & Drivers
│   ├── Persistence/       # Database implementations
│   ├── ExternalServices/  # Third-party integrations
│   └── Providers/         # Service providers
└── Interface/             # Interface Adapters
    ├── Http/              # HTTP controllers & routes
    └── Presenters/        # Output formatters
\`\`\`

## Key Benefits

1. **Testable**: Domain and Use Cases can be tested without frameworks
2. **Independent**: Business logic is framework-agnostic
3. **Maintainable**: Changes in outer layers don't affect inner layers
4. **Flexible**: Easy to swap databases or frameworks

Created with ❤️ using Gravito Framework
`
  }

  protected override generatePackageJson(context: GeneratorContext): string {
    const pkg = {
      name: context.nameKebabCase,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/bootstrap.ts',
        build: 'bun build ./src/bootstrap.ts --outdir ./dist --target bun',
        start: 'bun run dist/bootstrap.js',
        test: 'bun test',
        typecheck: 'tsc --noEmit',
        'docker:build': `docker build -t ${context.nameKebabCase} .`,
        'docker:run': `docker run -it -p 3000:3000 ${context.nameKebabCase}`,
      },
      dependencies: {
        'gravito-core': 'workspace:*',
        '@gravito/enterprise': 'workspace:*',
        ...(context.withSpectrum ? { '@gravito/spectrum': 'workspace:*' } : {}),
      },
      devDependencies: {
        '@types/bun': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }
}
