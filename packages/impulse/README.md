---
title: Orbit Request
---

# Orbit Request

Form Request validation for Gravito with Zod and Valibot support.

**Orbit Request** provides Laravel-style request validation for Gravito applications. Define your validation rules as classes and get type-safe validated data in your controllers.

## Features

- **Type-Safe Validation**: Full TypeScript inference with Zod or Valibot
- **Class-Based Requests**: Organize validation logic into reusable classes
- **Authorization Hook**: Built-in `authorize()` method for access control
- **Multiple Data Sources**: Validate JSON, form data, query params, or route params
- **Structured Errors**: Consistent error response format
- **Custom Messages**: Override error messages per field
- **i18n Support**: Pluggable MessageProvider for localization
- **Router Integration**: Use directly in Gravito router definitions

## Installation

```bash
bun add @gravito/impulse
```

## Basic Usage

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
    const data = ctx.get('validated') as {
      name: string
      email: string
      age?: number
    }
    return ctx.json({ user: data })
  }
}
```

## Authorization

Add authorization logic to restrict access:

```typescript
import { FormRequest, z } from '@gravito/impulse'
import type { Context } from '@gravito/photon'

export class AdminRequest extends FormRequest {
  schema = z.object({
    action: z.string(),
  })

  // Return false to reject with 403
  authorize(ctx: Context) {
    const user = ctx.get('user')
    return user?.role === 'admin'
  }

  // Optional: Custom authorization error message
  authorizationMessage() {
    return 'Admin access required'
  }
}
```

Failed authorization returns:

```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Admin access required",
    "details": []
  }
}
```

## Custom Error Messages

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

## i18n Support

Implement `MessageProvider` for full localization:

```typescript
import type { MessageProvider } from '@gravito/impulse'

export class CustomMessageProvider implements MessageProvider {
  getMessage(code: string, field: string, defaultMessage: string): string {
    const messages: Record<string, string> = {
      'email.invalid_string': 'Invalid email format',
      'name.too_small': 'Name is too short',
    }
    return messages[`${field}.${code}`] ?? defaultMessage
  }

  getValidationFailedMessage(): string {
    return 'Validation failed'
  }

  getUnauthorizedMessage(): string {
    return 'Unauthorized'
  }
}

// Use in FormRequest
export class LocalizedRequest extends FormRequest {
  schema = z.object({ email: z.string().email() })

  options = {
    messageProvider: new CustomMessageProvider(),
  }
}
```

## Valibot Support

Use Valibot instead of Zod:

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

The same FormRequest works with both libraries. Schema type is auto-detected.

## Data Sources

Change the data source for validation:

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

## Transform Data

Pre-process data before validation:

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

## License

MIT
