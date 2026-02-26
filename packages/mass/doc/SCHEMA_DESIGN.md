# Schema Design Best Practices

Designing robust, reusable schemas is essential for maintaining data quality in a distributed **Galaxy Architecture**. This guide covers the best practices for using `@gravito/mass`.

## 1. Domain-Specific Schemas

Every **Satellite** should define its own domain schemas. Avoid sharing raw database models as API schemas; instead, create dedicated `DTO` (Data Transfer Object) schemas.

```typescript
// satellites/catalog/src/schemas/product.schema.ts
import { Schema } from '@gravito/mass'

export const ProductSchema = Schema.Object({
  id: Schema.String({ format: 'uuid' }),
  name: Schema.String({ minLength: 1, maxLength: 100 }),
  price: Schema.Number({ minimum: 0 }),
  tags: Schema.Array(Schema.String())
})
```

## 2. Reusability & Composition

Leverage schema composition to avoid duplication. Use `partial()`, `pick()`, and `omit()` to derive specialized schemas from base definitions.

```typescript
import { Schema, partial } from '@gravito/mass'

// Base schema
export const UserBase = Schema.Object({
  email: Schema.String({ format: 'email' }),
  password: Schema.String({ minLength: 8 })
})

// Specialized for registration
export const RegisterSchema = Schema.Intersect([
  UserBase,
  Schema.Object({ inviteCode: Schema.String() })
])

// Specialized for partial updates
export const UpdateUserSchema = partial(UserBase)
```

## 3. Sharing Schemas with Beam (RPC)

One of the most powerful features of `@gravito/mass` is sharing schemas with `@gravito/beam`. By exporting your route types, the client automatically gets the same validation logic.

```typescript
// server.ts
app.post('/api/users', validate('json', RegisterSchema), (c) => { ... })
export type AppRoutes = typeof app

// client.ts
import { createBeam } from '@gravito/beam'
import type { AppRoutes } from './server'

const client = createBeam<AppRoutes>(...)
// client.api.users.$post({ json: { ... } }) -> Full autocomplete and validation!
```

## 4. Custom Error Messages

While `mass` provides excellent default error reports, you can customize them for better UX.

```typescript
const schema = Schema.Object({
  age: Schema.Number({ 
    minimum: 18, 
    errorMessage: 'You must be at least 18 years old' // Custom metadata
  })
})
```

## 5. Security: Strict Objects

By default, Gravito recommends using **Strict Objects** (stripping unknown properties) to prevent mass-assignment vulnerabilities.

```typescript
// In your global configuration or per-route
validate('json', schema, { stripUnknown: true })
```
