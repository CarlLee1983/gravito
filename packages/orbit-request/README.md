---
title: Orbit Request
---

# Orbit Request

Form Request validation for Gravito with Zod integration.

**Orbit Request** provides Laravel-style request validation for Gravito applications. Define your validation rules as classes and get type-safe validated data in your controllers.

## Features

- **Type-Safe Validation**: Zod schemas with full TypeScript inference
- **Class-Based Requests**: Organize validation logic into reusable classes
- **Authorization**: Built-in authorize() hook for access control
- **Multiple Data Sources**: Validate JSON, form data, query params, or route params
- **Structured Errors**: Consistent error response format

## Installation

```bash
bun add @gravito/orbit-request
```

## Usage

### 1. Define a FormRequest

```typescript
// src/requests/StoreUserRequest.ts
import { FormRequest, z } from '@gravito/orbit-request'

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
import { validateRequest } from '@gravito/orbit-request'
import { StoreUserRequest } from './requests/StoreUserRequest'

core.router.post(
  '/users',
  validateRequest(StoreUserRequest),
  [UserController, 'store']
)
```

### 3. Access Validated Data

```typescript
// src/controllers/UserController.ts
export class UserController {
  store(ctx: Context) {
    // Type-safe validated data
    const data = ctx.get('validated') as {
      name: string
      email: string
      age?: number
    }

    return ctx.json({ user: data })
  }
}
```

## Data Sources

By default, FormRequest validates JSON body. Change the source:

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

## Authorization

Add authorization logic to requests:

```typescript
class AdminRequest extends FormRequest {
  schema = z.object({
    action: z.string(),
  })

  authorize(ctx: Context) {
    const user = ctx.get('user')
    return user?.role === 'admin'
  }
}
```

Failed authorization returns 403 with:

```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Unauthorized",
    "details": []
  }
}
```

## Validation Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format", "code": "invalid_string" },
      { "field": "name", "message": "Name must be at least 2 characters", "code": "too_small" }
    ]
  }
}
```

## Transform Data

Pre-process data before validation:

```typescript
class UppercaseRequest extends FormRequest {
  schema = z.object({
    code: z.string().length(6),
  })

  transform(data: any) {
    return {
      ...data,
      code: data.code?.toUpperCase(),
    }
  }
}
```

## License

MIT
