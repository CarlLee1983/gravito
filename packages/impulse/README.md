---
title: Orbit Request
---

# Orbit Request

Form Request validation for Gravito with Zod and Valibot support.

**Orbit Request** (@gravito/impulse) provides Laravel-style request validation for Gravito applications. Define your validation rules as classes and get type-safe validated data in your controllers.

## Features

- **Type-Safe Validation**: Full TypeScript inference with Zod or Valibot
- **Class-Based Requests**: Organize validation logic into reusable classes
- **Performance Optimized**: Multi-layer caching (Schema, Instance, Compilation)
- **Authorization Hook**: Built-in `authorize()` method for access control
- **Multiple Data Sources**: Validate JSON, form data, query params, or route params
- **Structured Errors**: Consistent error response format
- **i18n Support**: Pluggable MessageProvider for localization

## Installation

```bash
bun add @gravito/impulse
```

## Quick Start

### 1. Define a FormRequest

```typescript
// src/requests/StoreUserRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class StoreUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18).optional(),
  })
}
```

### 2. Apply to Routes

```typescript
import { StoreUserRequest } from './requests/StoreUserRequest'

// Direct router integration (recommended)
core.router.post('/users', StoreUserRequest, [UserController, 'store'])

// Or with explicit middleware
import { validateRequest } from '@gravito/impulse'
core.router.post('/users', validateRequest(StoreUserRequest), [UserController, 'store'])
```

### 3. Access Validated Data

```typescript
// src/controllers/UserController.ts
export class UserController {
  store(ctx: Context) {
    // Fully typed data based on your Zod schema
    const data = ctx.get('validated') as {
      name: string
      email: string
      age?: number
    }
    return ctx.json({ user: data })
  }
}
```

## Advanced Usage

### Authorization

Add authorization logic to restrict access:

```typescript
import { FormRequest, z } from '@gravito/impulse'
import type { Context } from '@gravito/photon'

export class AdminRequest extends FormRequest {
  schema = z.object({
    action: z.string(),
  })

  // Return false to reject with 403
  async authorize(ctx: Context) {
    const user = ctx.get('user')
    // Async checks supported
    const hasPermission = await checkPermission(user.id, 'admin')
    return hasPermission
  }

  // Optional: Custom authorization error message
  authorizationMessage() {
    return 'Admin access required'
  }
}
```

### Custom Error Messages

Override default validation messages:

```typescript
export class StoreUserRequest extends FormRequest {
  schema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
  })

  // Map field.code to custom message
  messages() {
    return {
      'email.invalid_string': 'Please enter a valid email address',
      'name.too_small': 'Name must be at least 2 characters',
    }
  }
}
```

### Data Sources

Change the data source for validation using the `source` property:

```typescript
class SearchRequest extends FormRequest {
  source = 'query' // Validate query parameters

  schema = z.object({
    q: z.string().min(1),
    page: z.coerce.number().default(1),
  })
}
```

| Source | Description |
|--------|-------------|
| `json` | Request body (default) |
| `form` | Form data (multipart/form-data) |
| `query` | URL query parameters |
| `param` | Route parameters |

### Data Transformation

Pre-process data before validation using `transform()`:

```typescript
class UppercaseRequest extends FormRequest {
  schema = z.object({
    code: z.string().length(6),
  })

  transform(data: unknown) {
    const d = data as { code?: string }
    return {
      ...d,
      code: d.code?.toUpperCase(),
    }
  }
}
```

### Valibot Support

You can use [Valibot](https://valibot.dev/) instead of Zod. Impulse automatically detects the schema library.

```typescript
import { FormRequest } from '@gravito/impulse'
import * as v from 'valibot'

export class StoreUserRequest extends FormRequest {
  schema = v.object({
    name: v.pipe(v.string(), v.minLength(2)),
    email: v.pipe(v.string(), v.email()),
  })
}
```

## Performance

Orbit Request is built for high-performance applications with multi-layer caching:

- **Instance Caching**: FormRequest instances are cached in a WeakMap, reusing them across requests to reduce memory allocation.
- **Schema Caching**: Schema types (Zod vs Valibot) are detected once and cached.
- **Compilation Caching**: Schemas are compiled into optimized validator functions (up to 100x faster for repeated validations).
- **Message Caching**: Custom error messages are resolved once and cached per class.
- **Data Extraction Caching**: Request body parsing is cached to prevent redundant operations.

**Benchmarks (Apple M1 Pro):**
- **Schema Type Detection**: ~80x faster
- **FormRequest Creation**: ~6x faster
- **Message Resolution**: ~10x faster

## Best Practices

1.  **Reuse Schemas**: Define Zod schemas outside the class if they are shared across requests.
2.  **Keep it Static**: Avoid dynamic schema generation in the `schema` property. Impulse optimizes for static schemas.
3.  **Use `transform` sparingly**: Only use `transform` for necessary coercion. Let the schema handle validation logic.
4.  **Type Safety**: Use `z.infer<typeof schema>` to export types for your controllers.

## Troubleshooting

### Validation fails silently?
Check if your middleware is correctly applied. Ensure `validateRequest` wraps your class if not using the Gravito Router's auto-detection.

### Type errors on `ctx.get('validated')`?
You need to cast the result, or use module augmentation to add your types to `GravitoVariables`.

### Authorization always fails?
Ensure your `authorize` method returns `true` (or a Promise resolving to `true`). If it returns `undefined` or `void`, it is treated as false.

## License

MIT
