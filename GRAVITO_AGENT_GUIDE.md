# Gravito Framework: AI Agent Implementation Guide

> **Version**: 1.0.0 (Post-Dogfooding Fixes)
> **Architecture**: Action Domain (ADR)
> **Purpose**: Rapid onboarding for AI Agents to generate production-ready Gravito code.

---

## 1. Project Structure (Action Domain)

We strictly follow the **Action-Domain-Responder (ADR)** pattern variant.

```
src/
├── actions/           # Business Logic (Single Responsibility)
│   ├── Action.ts      # Base Abstract Class
│   └── [Domain]/      # e.g., player, wallet, game
│       └── CreatePlayerAction.ts
├── models/            # Database Entities (Atlas ORM)
│   ├── User.ts
│   └── Wallet.ts
├── repositories/      # Data Access Layer
│   └── UserRepository.ts
├── controllers/       # HTTP Transport Layer
│   └── api/v1/        # Versioned Controllers
│       └── PlayerController.ts
├── middleware/        # Request Interceptors (Auth, Logging)
│   └── VerifySignature.ts
├── routes/            # Route Definitions
│   └── api.ts
├── types/             # TypeScript Definitions
│   ├── requests/
│   └── responses/
├── integrations/      # External Service Drivers (Factory Pattern)
│   ├── GameProvider.ts
│   ├── GameProviderFactory.ts
│   └── drivers/
└── bootstrap.ts       # Application Entry Point
```

---

## 2. Core Components & Patterns

### A. Models (Atlas ORM)
**Rule**: Use `@gravito/atlas`. Always define `static table`. Use `@column` decorators.

```typescript
import { Model, column, HasMany } from '@gravito/atlas'
import { Wallet } from './Wallet'

export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  id!: number

  @column()
  name!: string

  // Relationships
  @HasMany(() => Wallet)
  wallets!: Wallet[]
}
```

### B. Repositories
**Rule**: Encapsulate all DB queries here. Do not write queries in Controllers.

```typescript
import { User } from '../models/User'

export class UserRepository {
  async findByAccount(account: string): Promise<User | null> {
    return await User.query().where('name', account).first()
  }

  async create(data: Partial<User>): Promise<User> {
    const results = await User.query().insert(data)
    return results[0]! // Atlas returns array for inserts
  }
}
```

### C. Actions (Business Logic)
**Rule**: One class per action. Extend `Action<Input, Output>`. Handle Transactions here.

```typescript
import { Action } from '../Action'
import { DB } from '@gravito/atlas'
// ... imports

export class CreateUserAction extends Action<CreateUserInput, User> {
  constructor(private userRepo = new UserRepository()) { super() }

  async execute(input: CreateUserInput): Promise<User> {
    return await DB.transaction(async () => {
      // Logic here...
      return await this.userRepo.create(input)
    })
  }
}
```

### D. Controllers (HTTP Layer)
**Rule**: Thin layer. Parse request -> Call Action -> Return JSON.
**Critical**: Use `c.req.query('key')` for single params.

```typescript
import type { GravitoContext } from '@gravito/core'
import { CreateUserAction } from '../../../actions/user/CreateUserAction'

export class UserController {
  async create(c: GravitoContext) {
    try {
      // Best Practice: Get body from middleware cache if available
      const body = (c.get('parsed_body') || await c.req.json()) as any
      
      const action = new CreateUserAction()
      const result = await action.execute({ 
        name: body.name 
      })

      return c.json({ success: true, data: result })
    } catch (e: any) {
      return c.json({ success: false, message: e.message }, 500)
    }
  }
}
```

### E. Routes
**Rule**: Use `router.prefix().group()`. Do NOT use `router.group()` directly.

```typescript
import type { Router } from '@gravito/core'
import { UserController } from '../controllers/api/v1/UserController'

export function registerApiRoutes(router: Router) {
  const user = new UserController()

  router.prefix('/v1').group((group) => {
    group.post('/users', (c) => user.create(c))
  })
}
```

---

## 3. Critical Best Practices (Gotchas)

### 1. Request Body Caching (The "Body already used" Fix)
In Middleware, after parsing the body, store it in the context to avoid stream consumption errors in Controllers.

**Middleware Implementation:**
```typescript
// src/middleware/SomeMiddleware.ts
try {
  const body = await c.req.json()
  c.set('parsed_body', body) // Store for controller
  // ... validation logic
} catch (e) { /* ignore if no body */ }
```

**Controller Usage:**
```typescript
const body = (c.get('parsed_body') || await c.req.json()) as any
```

### 2. Database Transactions
Always wrap multi-step DB operations in `DB.transaction`.
```typescript
return await DB.transaction(async () => {
  await repo1.update()
  await repo2.create()
})
```

### 3. Numeric Comparisons with SQLite
Atlas/SQLite returns decimals as strings. **Always cast to Number** before comparing.
```typescript
// BAD
if (wallet.balance < amount) // "1000" < 500 might behave unexpectedly

// GOOD
if (Number(wallet.balance) < amount)
```

### 4. Integration Driver Pattern
For external services (Games, SMS), use **Factory + Interface**.
*   **Interface**: `src/integrations/GameProvider.ts`
*   **Factory**: `src/integrations/GameProviderFactory.ts`
*   **Driver**: `src/integrations/drivers/PGSoftDriver.ts`

---

## 4. Bootstrapping
Ensure `OrbitAtlas` is installed in `bootstrap.ts` to initialize the DB connection.

```typescript
import { OrbitAtlas } from '@gravito/atlas'
import databaseConfig from '../config/database'

const core = new PlanetCore({
  config: { database: databaseConfig }
})

await core.orbit(new OrbitAtlas()) // CRITICAL
```

---

*Generated by Gravito Architect Agent based on Hub-ADR implementation.*
