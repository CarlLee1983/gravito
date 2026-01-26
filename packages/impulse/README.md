---
title: Orbit Request (Impulse)
---

# Orbit Request 🚀

**Impulse** (@gravito/impulse) is a high-performance request validation module for the Gravito framework. It provides a declarative, class-based approach to request validation, inspired by Laravel's FormRequest, but reimagined for the TypeScript ecosystem with native support for **Zod** and **Valibot**.

## 🌟 Key Features

- **Declarative Validation**: Organize your validation rules into clean, reusable classes.
- **Library Agnostic**: Built-in support for both [Zod](https://zod.dev/) and [Valibot](https://valibot.dev/).
- **Extreme Performance**: Multi-layer caching system (Instance, Schema, Compilation) ensures validation is blazing fast.
- **Type Safety**: Full TypeScript inference. Your validated data is automatically typed based on your schema.
- **Rich Context**: Integrated authorization hooks, data transformation, and custom error messaging.
- **Multi-Source**: Easily validate JSON bodies, multipart forms, query parameters, or route parameters.
- **Blueprint Generation**: Automatically export validation rules to JSON for frontend synchronization.
- **i18n Ready**: Pluggable `MessageProvider` for localized error messages.

## 📦 Installation

```bash
bun add @gravito/impulse
```

## 🚀 Quick Start

### 1. Define your Request Class

Create a class that extends `FormRequest`. Define your rules in the `schema` property.

```typescript
// src/requests/CreateUserRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class CreateUserRequest extends FormRequest {
  // Use Zod (or Valibot) for rules
  schema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().min(18).optional(),
  })

  // Optional: Check permissions before validation
  async authorize(ctx) {
    return true // Logic to allow/deny access
  }
}
```

### 2. Apply to Routes

Impulse integrates seamlessly with Gravito's router.

```typescript
import { CreateUserRequest } from './requests/CreateUserRequest'

// The router automatically applies the validation middleware
router.post('/users', CreateUserRequest, [UserController, 'store'])
```

### 3. Use Validated Data

Access the safe, typed data in your controller.

```typescript
// src/controllers/UserController.ts
import { type CreateUserRequest } from '../requests/CreateUserRequest'
import { z } from 'zod'

export class UserController {
  async store(ctx) {
    // Data is already validated and typed!
    const data = ctx.get('validated') as z.infer<CreateUserRequest['schema']>
    
    return ctx.json({ message: 'User created', data }, 201)
  }
}
```

## 🛠️ Advanced Usage

### Data Sources
By default, Impulse looks at the JSON body. You can change this via the `source` property:

```typescript
export class SearchRequest extends FormRequest {
  source = 'query' // or 'form', 'param', 'json'
  
  schema = z.object({
    q: z.string(),
    page: z.coerce.number().default(1)
  })
}
```

### Data Transformation
Pre-process input before it hits the validator:

```typescript
export class ProfileRequest extends FormRequest {
  transform(data: any) {
    return {
      ...data,
      email: data.email?.toLowerCase(),
    }
  }
}
```

### Custom Error Messages
Override default library messages with user-friendly ones:

```typescript
export class LoginRequest extends FormRequest {
  messages() {
    return {
      'email.invalid_string': 'Please provide a valid email address.',
      'password.too_small': 'Password must be at least 8 characters long.',
    }
  }
}
```

### Blueprints (Frontend Sync)
Get a JSON representation of your validation rules for use in the frontend:

```typescript
const request = new CreateUserRequest()
const blueprint = request.getBlueprint()
// Use this to generate frontend forms or validation logic
```

## ⚡ Performance Optimization

Impulse is built with performance as a first-class citizen:

1.  **Instance Caching**: `FormRequest` instances are reused via `FormRequestInstanceCache`.
2.  **Schema Cache**: Schema library detection (Zod vs Valibot) is cached.
3.  **Compilation Cache**: Schemas are compiled into optimized validator functions for 100x faster repeated execution.
4.  **Message Cache**: Resolved error messages are cached per field/code combination.

## 🤝 Support

For more details, visit the [Gravito Documentation](https://gravito.dev).

## 📄 License

MIT © Carl Lee
