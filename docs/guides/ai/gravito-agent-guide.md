# Gravito Framework: AI Agent Implementation Guide

> **Version**: 1.0.0 (Galaxy Architecture)
> **Architecture**: Core-Orbit-Satellite (Galaxy)
> **Purpose**: Rapid onboarding for AI Agents to generate production-ready Gravito 1.0 code.

---

## 1. Galaxy Architecture & MDD

Gravito 1.0 follows the **Galaxy Architecture** and **Manifest-Driven Development (MDD)**.

### A. The Hierarchy
- **PlanetCore (@gravito/core)**: The micro-kernel (IoC, Lifecycle, Hooks).
- **Orbits (Infrastructure)**: Strategic extensions (Database, Auth, View Engine). 
  - e.g., `OrbitAtlas` (DB), `OrbitIon` (Inertia), `OrbitSignal` (Mail).
- **Satellites (Domain)**: Self-contained business modules (Catalog, Cart, Membership).

### B. The Manifest (`gravito.config.ts`)
The single source of truth for application composition.
```typescript
export default {
  name: 'My Store',
  modules: [
    'catalog',    // Auto-mounts Catalog Satellite
    'membership', // Auto-mounts Membership Satellite
  ],
  settings: { locale: 'en-US' }
}
```

---

## 2. Project Structure (Domain-Driven)

We strictly follow a modular, domain-driven structure within Satellites or local source.

```
src/
├── config/             # Configuration files (gravito.config.ts)
├── controllers/        # HTTP Transport Layer (Photon/Ion)
├── use-cases/          # Business Logic (Application Layer)
│   └── [Domain]/       # e.g., catalog, order
├── models/             # Database Entities (Atlas ORM)
├── repositories/       # Data Access Layer
├── middleware/         # Request Interceptors
├── views/              # Root HTML templates (Prism)
├── client/             # Frontend SPA (React/Vue/Svelte)
└── entry-server.ts     # Application Entry Point
```

---

## 3. Core Components & Patterns

### A. Models (Atlas ORM)
**Rule**: Use `@gravito/atlas`. Define `static table`. Use `@column` decorators.

```typescript
import { Model, column, HasMany } from '@gravito/atlas'
import { Wallet } from './Wallet'

export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  id!: number

  @column()
  name!: string

  @HasMany(() => Wallet)
  wallets!: Wallet[]
}
```

### B. Use Cases (Business Logic)
**Rule**: Extend `UseCase<Input, Output>` from `@gravito/enterprise`. One class per operation.

```typescript
import { UseCase } from '@gravito/enterprise'
import { DB } from '@gravito/atlas'

export class CreateUserUseCase extends UseCase<CreateUserInput, User> {
  constructor(private userRepo = new UserRepository()) { super() }

  async execute(input: CreateUserInput): Promise<User> {
    return await DB.transaction(async () => {
      // Logic here...
      return await this.userRepo.create(input)
    })
  }
}
```

### C. Controllers (Inertia/Ion)
**Rule**: Return `inertia.render` for SPA pages or `c.json` for APIs.

```typescript
import { Context } from '@gravito/photon'
import { InertiaService } from '@gravito/ion'
import { CreateUserUseCase } from '../use-cases/user/CreateUserUseCase'

export class UserController {
  async index(c: Context) {
    const inertia = c.get('inertia') as InertiaService
    return inertia.render('User/List', { users: await User.all() })
  }

  async store(c: Context) {
    const body = c.get('parsed_body') || await c.req.json()
    const result = await new CreateUserUseCase().execute(body)
    return c.json({ success: true, data: result })
  }
}
```

---

## 4. Critical Best Practices (Gotchas)

### 1. Request Body Caching
To avoid "Body already used" errors, store parsed body in middleware.
```typescript
const body = (c.get('parsed_body') || await c.req.json())
```

### 2. Numeric Comparisons (SQLite)
SQLite returns decimals as strings. **Always cast to Number**.
```typescript
if (Number(wallet.balance) < amount)
```

### 3. Service Auto-Discovery
Use `Application` class to leverage auto-discovery of providers.

---

## 5. Bootstrapping (1.0 Standard)

```typescript
import { Application } from '@gravito/core'

const app = new Application({
  basePath: import.meta.dir,
})

await app.boot()
export default app.core.liftoff()
```

---

*Last Updated: 2026-02-23 | Galaxy Architecture 1.0*

